
from functools import lru_cache

from sentence_transformers import SentenceTransformer


MODEL_NAME = "sentence-transformers/all-MiniLM-L6-v2"
EMBEDDING_DIMENSIONS = 384
EMBEDDING_BATCH_SIZE = 32


@lru_cache(maxsize=1)
def get_embedding_model() -> SentenceTransformer:
    """Load the local embedding model once and reuse it."""
    return SentenceTransformer(
        MODEL_NAME,
        device="cpu",
    )


def generate_embeddings(texts: list[str]) -> list[list[float]]:
    """Generate normalized embeddings for a batch of texts."""
    if not texts:
        return []

    model = get_embedding_model()

    embeddings = model.encode(
        texts,
        batch_size=EMBEDDING_BATCH_SIZE,
        show_progress_bar=False,
        convert_to_numpy=True,
        normalize_embeddings=True,
    )

    return embeddings.tolist()


def generate_embedding(text: str) -> list[float]:
    """Generate an embedding for a single query."""
    embeddings = generate_embeddings([text])
    return embeddings[0]
