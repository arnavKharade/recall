
import hashlib
import uuid
from pathlib import Path

from fastapi import HTTPException, UploadFile, status

from app.core.config import settings


CHUNK_SIZE = 1024 * 1024
PDF_SIGNATURE = b"%PDF-"


def get_stored_file_path(storage_key: str) -> Path:
    storage_root = settings.storage_dir.resolve()
    file_path = (storage_root / storage_key).resolve()

    if not file_path.is_relative_to(storage_root):
        raise ValueError("Invalid document storage path.")

    return file_path


async def save_pdf(
    file: UploadFile,
    user_id: uuid.UUID,
) -> tuple[str, str, int]:
    original_filename = (file.filename or "").replace("\\", "/").split("/")[-1]

    if not original_filename or not original_filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only PDF files are allowed.",
        )

    storage_id = uuid.uuid4()
    relative_path = Path(str(user_id)) / f"{storage_id}.pdf"
    destination = get_stored_file_path(relative_path.as_posix())

    destination.parent.mkdir(parents=True, exist_ok=True)

    total_size = 0
    file_hash = hashlib.sha256()
    first_chunk = True

    try:
        with destination.open("wb") as output:
            while True:
                chunk = await file.read(CHUNK_SIZE)

                if not chunk:
                    break

                if first_chunk:
                    first_chunk = False

                    if not chunk.startswith(PDF_SIGNATURE):
                        raise HTTPException(
                            status_code=status.HTTP_400_BAD_REQUEST,
                            detail="The uploaded file is not a valid PDF.",
                        )

                total_size += len(chunk)

                if total_size > settings.max_upload_size:
                    raise HTTPException(
                        status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                        detail="PDF exceeds the maximum upload size of 25 MB.",
                    )

                file_hash.update(chunk)
                output.write(chunk)

        if total_size == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="The uploaded PDF is empty.",
            )

        return (
            relative_path.as_posix(),
            file_hash.hexdigest(),
            total_size,
        )

    except Exception:
        destination.unlink(missing_ok=True)
        raise

    finally:
        await file.close()


def delete_stored_file(storage_key: str) -> None:
    file_path = get_stored_file_path(storage_key)
    file_path.unlink(missing_ok=True)
