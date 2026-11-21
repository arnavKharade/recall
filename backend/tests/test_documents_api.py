
def test_upload_pdf(client, auth_headers, test_storage):
    response = client.post(
        "/api/v1/documents/upload",
        headers=auth_headers,
        files={
            "file": (
                "test-document.pdf",
                b"%PDF-1.4\nTest PDF content",
                "application/pdf",
            )
        },
    )

    assert response.status_code == 201

    data = response.json()

    assert data["original_filename"] == "test-document.pdf"
    assert data["mime_type"] == "application/pdf"
    assert data["status"] == "uploaded"
    assert data["size_bytes"] > 0

    stored_files = list(test_storage.rglob("*.pdf"))
    assert len(stored_files) == 1


def test_upload_rejects_non_pdf_filename(client, auth_headers):
    response = client.post(
        "/api/v1/documents/upload",
        headers=auth_headers,
        files={
            "file": (
                "document.txt",
                b"%PDF-1.4\nTest content",
                "application/pdf",
            )
        },
    )

    assert response.status_code == 400
    assert response.json()["detail"] == "Only PDF files are allowed."


def test_upload_rejects_invalid_pdf_signature(
    client,
    auth_headers,
    test_storage,
):
    response = client.post(
        "/api/v1/documents/upload",
        headers=auth_headers,
        files={
            "file": (
                "invalid.pdf",
                b"This is not a PDF",
                "application/pdf",
            )
        },
    )

    assert response.status_code == 400
    assert response.json()["detail"] == (
        "The uploaded file is not a valid PDF."
    )

    assert list(test_storage.rglob("*.pdf")) == []


def test_list_documents(client, auth_headers):
    upload = client.post(
        "/api/v1/documents/upload",
        headers=auth_headers,
        files={
            "file": (
                "listed.pdf",
                b"%PDF-1.4\nTest content",
                "application/pdf",
            )
        },
    )

    assert upload.status_code == 201

    response = client.get(
        "/api/v1/documents",
        headers=auth_headers,
    )

    assert response.status_code == 200
    assert len(response.json()) == 1
    assert response.json()[0]["original_filename"] == "listed.pdf"


def test_document_requires_authentication(client):
    response = client.get("/api/v1/documents")

    assert response.status_code == 401


def test_user_cannot_access_another_users_document(client, auth_headers):
    upload = client.post(
        "/api/v1/documents/upload",
        headers=auth_headers,
        files={
            "file": (
                "private.pdf",
                b"%PDF-1.4\nPrivate content",
                "application/pdf",
            )
        },
    )

    document_id = upload.json()["id"]

    client.post(
        "/api/v1/auth/register",
        json={
            "name": "Another User",
            "email": "another@example.com",
            "password": "AnotherPassword123!",
        },
    )

    login = client.post(
        "/api/v1/auth/login",
        json={
            "email": "another@example.com",
            "password": "AnotherPassword123!",
        },
    )

    another_headers = {
        "Authorization": f"Bearer {login.json()['access_token']}"
    }

    response = client.get(
        f"/api/v1/documents/{document_id}",
        headers=another_headers,
    )

    assert response.status_code == 404


def test_delete_document(client, auth_headers, test_storage):
    upload = client.post(
        "/api/v1/documents/upload",
        headers=auth_headers,
        files={
            "file": (
                "delete-me.pdf",
                b"%PDF-1.4\nTemporary content",
                "application/pdf",
            )
        },
    )

    assert upload.status_code == 201

    document_id = upload.json()["id"]

    stored_files = list(test_storage.rglob("*.pdf"))
    assert len(stored_files) == 1

    response = client.delete(
        f"/api/v1/documents/{document_id}",
        headers=auth_headers,
    )

    assert response.status_code == 204
    assert not stored_files[0].exists()

    follow_up = client.get(
        f"/api/v1/documents/{document_id}",
        headers=auth_headers,
    )

    assert follow_up.status_code == 404
