import mysql.connector
from elasticsearch import Elasticsearch

# Konektiranje na MySQL
db_connection = mysql.connector.connect(
    host="localhost",  # zamijeni sa svojim hostom
    user="npausic",    # MySQL korisničko ime
    password="Spineict@2025!",  # Lozinka za MySQL
    database="SpineICT_OCR"  # Baza podataka
)

cursor = db_connection.cursor(dictionary=True)

# Konektiranje na Elasticsearch
es = Elasticsearch(["http://localhost:9200"])

# Funkcija za indeksiranje dokumenata u Elasticsearch
def index_documents_in_elasticsearch(documents):
    for doc in documents:
        document_data = {
            "ocrresult": doc["ocrresult"],
            "supplier_name_ocr": doc["supplier_name_ocr"]
        }
        
        # Indeksiraj svaki dokument u Elasticsearch
        es.index(index="spineict_ocr", id=doc["id"], body=document_data)
        print(f"Indexed document ID: {doc['id']}")

# Funkcija koja se poziva odmah nakon što se dokumenti dodaju u bazu
def index_new_documents_on_upload():
    # Dohvati novouvedene dokumente koji nisu još indeksirani
    cursor.execute("SELECT id, ocrresult, supplier_name_ocr FROM documents WHERE indexed = 0")
    new_documents = cursor.fetchall()

    if new_documents:
        print(f"Found {len(new_documents)} new documents.")
        # Indeksiraj nove dokumente
        index_documents_in_elasticsearch(new_documents)

        # Označi te dokumente kao indeksirane
        cursor.execute("UPDATE documents SET indexed = 1 WHERE indexed = 0")
        db_connection.commit()
        print(f"{len(new_documents)} documents indexed and marked as indexed.")
    else:
        print("No new documents found.")

# Ovdje pozivaš funkciju odmah nakon što završi upload dokumenta
index_new_documents_on_upload()

# Zatvori konekciju na bazu
cursor.close()
db_connection.close()
