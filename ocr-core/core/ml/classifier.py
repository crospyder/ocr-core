from transformers import pipeline
import logging

logger = logging.getLogger(__name__)
logger.info("Učitavam lagani Huggingface model...")

classifier = pipeline(
    "zero-shot-classification",
    model="microsoft/Multilingual-MiniLM-L12-H384",
    device=-1  # CPU
)

logger.info("Lagani model učitan, spreman za korištenje.")
