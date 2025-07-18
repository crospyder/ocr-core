from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from core.database.connection import get_db
from core.database.models import MailAccount, MailProcessed
import imaplib
import email
from email import policy
from email.parser import BytesParser
from core.routes.mail_accounts import decrypt_password
from datetime import datetime, timezone
from email.header import decode_header
import unicodedata
import re
from io import BytesIO
from PIL import Image
import traceback

router = APIRouter(prefix="/api/mail_processing", tags=["mail_processing"])

MAX_PIXELS = 25_000_000  # prag veličine slike, možeš podesiti
MAX_PDF_SIZE = 5 * 1024 * 1024  # 5 MB limit

def decode_mime_words(s):
    decoded = decode_header(s)
    return ''.join([
        (t[0].decode(t[1] if t[1] else "utf-8") if isinstance(t[0], bytes) else t[0])
        for t in decoded
    ])

def normalize_filename(name):
    if not name:
        return ""
    name = unicodedata.normalize('NFKC', name)
    name = re.sub(r'\s+', ' ', name)
    return name.strip().lower()

def is_pdf_image_size_valid(pdf_bytes: bytes) -> bool:
    try:
        with Image.open(BytesIO(pdf_bytes)) as img:
            width, height = img.size
            total_pixels = width * height
            if total_pixels > MAX_PIXELS:
                return False
            return True
    except Exception:
        # Ako nije slika ili ne može otvoriti, pretpostavi valjano
        return True

def fetch_mail_list_with_attachments(imap_server, imap_port, username, password, since_date=None):
    print(f"[LOG] Spajam se na IMAP server {imap_server}:{imap_port} s korisnikom {username}")
    mail = imaplib.IMAP4_SSL(imap_server, imap_port)
    mail.login(username, password)
    mail.select("INBOX")

    if since_date:
        since_formatted = since_date.strftime("%d-%b-%Y")
        print(f"[LOG] Dohvaćam mailove od datuma: {since_formatted}")
        typ, data = mail.search(None, f'(SINCE "{since_formatted}")')
    else:
        print(f"[LOG] Dohvaćam sve mailove")
        typ, data = mail.search(None, "ALL")

    if typ != "OK":
        mail.logout()
        raise Exception("Ne mogu dohvatiti listu mailova")

    uids = data[0].split()
    print(f"[LOG] Pronađeno mailova: {len(uids)}")
    messages = []

    for uid in uids:
        typ, full_msg_data = mail.fetch(uid, "(RFC822)")
        if typ != "OK":
            print(f"[WARNING] Ne mogu dohvatiti mail UID {uid.decode()}")
            continue

        full_msg = BytesParser(policy=policy.default).parsebytes(full_msg_data[0][1])
        mail_from = full_msg.get("From", "")
        mail_date = full_msg.get("Date", "")
        mail_subject = full_msg.get("Subject", "")

        attachments = []
        for part in full_msg.iter_attachments():
            filename = part.get_filename()
            if filename:
                filename_decoded = decode_mime_words(filename)
                # Filter samo PDF i do 5 MB
                if filename_decoded.lower().endswith(".pdf"):
                    size = len(part.get_payload(decode=True)) if part.get_payload(decode=True) else 0
                    if size <= MAX_PDF_SIZE:
                        attachments.append({"filename": filename_decoded, "size": size})

        if attachments:
            print(f"[LOG] Mail UID {uid.decode()} ima {len(attachments)} relevantnih privitaka")
            messages.append({
                "uid": uid.decode(),
                "from_": mail_from,
                "date": mail_date,
                "subject": mail_subject,
                "attachments": attachments,
            })

    mail.logout()
    print(f"[LOG] Ukupno mailova s relevantnim privicima: {len(messages)}")
    return messages

@router.get("/mail/list")
async def get_mail_list(db: Session = Depends(get_db)):
    print("[LOG] Pozvan endpoint /mail/list")
    account = db.query(MailAccount).filter(MailAccount.active == True).first()
    if not account:
        print("[ERROR] Nema aktivnog mail accounta")
        raise HTTPException(status_code=404, detail="Nema aktivnog mail accounta")

    processed_uids = db.query(MailProcessed.uid).filter(MailProcessed.mail_account_id == account.id).all()
    processed_uids_set = set(uid for (uid,) in processed_uids)
    print(f"[LOG] Pronađeno već obrađenih mailova: {len(processed_uids_set)}")

    try:
        password_decrypted = decrypt_password(account.password_encrypted)
        now = datetime.now(timezone.utc)
        since_date = datetime(year=now.year-1, month=1, day=1, tzinfo=timezone.utc)

        messages = fetch_mail_list_with_attachments(
            account.imap_server,
            account.imap_port,
            account.username,
            password_decrypted,
            since_date=since_date
        )

        new_messages = [msg for msg in messages if msg["uid"] not in processed_uids_set]
        print(f"[LOG] Mailova za obradu: {len(new_messages)}")

    except Exception as e:
        print(f"[ERROR] Greška prilikom dohvaćanja mailova: {e}")
        raise HTTPException(status_code=500, detail=str(e))

    return new_messages

@router.post("/mail/process-batch")
async def process_mail_batch(db: Session = Depends(get_db)):
    print("[LOG] Pozvan endpoint /mail/process-batch")
    account = db.query(MailAccount).filter(MailAccount.active == True).first()
    if not account:
        print("[ERROR] Nema aktivnog mail accounta")
        raise HTTPException(status_code=404, detail="Nema aktivnog mail accounta")

    processed_uids = db.query(MailProcessed.uid).filter(MailProcessed.mail_account_id == account.id).all()
    processed_uids_set = set(uid for (uid,) in processed_uids)
    print(f"[LOG] Pronađeno već obrađenih mailova: {len(processed_uids_set)}")

    try:
        password_decrypted = decrypt_password(account.password_encrypted)
        now = datetime.now(timezone.utc)
        since_date = datetime(year=now.year-1, month=1, day=1, tzinfo=timezone.utc)

        mail = imaplib.IMAP4_SSL(account.imap_server, account.imap_port)
        mail.login(account.username, password_decrypted)
        mail.select("INBOX")

        typ, data = mail.search(None, f'(SINCE "{since_date.strftime("%d-%b-%Y")}")')
        if typ != "OK":
            mail.logout()
            raise Exception("Ne mogu dohvatiti listu mailova")

        uids = data[0].split()

        results = []
        from core.routes.upload import process_uploaded_file

        for uid in uids:
            uid_str = uid.decode()
            if uid_str in processed_uids_set:
                continue  # preskoči već obrađene

            typ, full_msg_data = mail.fetch(uid, "(RFC822)")
            if typ != "OK" or not full_msg_data or not full_msg_data[0]:
                print(f"[WARNING] Ne mogu dohvatiti mail s UID {uid_str}, preskačem...")
                continue

            full_msg = email.message_from_bytes(full_msg_data[0][1], policy=email.policy.default)

            # Izlistaj attachmente iz tog maila
            attachment_filenames = []
            for part in full_msg.iter_attachments():
                att_name_raw = part.get_filename()
                if att_name_raw:
                    att_name_decoded = decode_mime_words(att_name_raw)
                    # Samo PDF i do 5 MB
                    if att_name_decoded.lower().endswith(".pdf"):
                        size = len(part.get_payload(decode=True)) if part.get_payload(decode=True) else 0
                        if size <= MAX_PDF_SIZE:
                            attachment_filenames.append((att_name_decoded, part))

            if not attachment_filenames:
                # Nema relevantnih attachmenta, preskoči mail
                continue

            for filename_original, part in attachment_filenames:
                try:
                    attachment_content = part.get_payload(decode=True)

                    # Nova validacija veličine slike unutar PDF-a
                    if not is_pdf_image_size_valid(attachment_content):
                        print(f"[WARNING] Attachment '{filename_original}' je prevelike dimenzije (više od {MAX_PIXELS} pixela), preskačem...")
                        continue

                    result = await process_uploaded_file(
                        file_bytes=attachment_content,
                        filename=filename_original,
                        document_type="email-prilog"
                    )
                except Exception as e:
                    print(f"[ERROR] Greška pri obradi attachmenta '{filename_original}' u mailu UID {uid_str}: {e}")
                    print(traceback.format_exc())
                    continue

                try:
                    processed_entry = MailProcessed(
                        mail_account_id=account.id,
                        uid=uid_str,
                        message_uid=uid_str,
                        processed_at=datetime.now(timezone.utc),
                        status="processed"
                    )
                    db.add(processed_entry)
                    db.commit()
                except IntegrityError:
                    db.rollback()
                    print(f"[WARNING] Mail UID {uid_str} već je obrađen (duplikat), preskačem unos u bazu.")
                except Exception as e:
                    print(f"[ERROR] Greška pri spremanju statusa obrađenog maila UID {uid_str}: {e}")
                    print(traceback.format_exc())

                print(f"[LOG] Mail UID {uid_str} attachment '{filename_original}' obrađen")
                results.append({"uid": uid_str, "filename": filename_original, "result": result})

        mail.logout()
        return {"success": True, "processed": len(results), "details": results}

    except Exception as e:
        print(f"[ERROR] Greška u batch obradi: {e}")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))
