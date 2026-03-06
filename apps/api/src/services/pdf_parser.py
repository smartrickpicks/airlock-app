"""PDF text extraction service — pdfplumber-based, no storage."""

from __future__ import annotations

from typing import Any


def extract_pages(pdf_bytes: bytes) -> list[dict[str, Any]]:
    """Extract per-page text from a PDF byte payload.

    Returns a list of PreflightPageInput-compatible dicts:
        {page, text, char_count, image_coverage_ratio}

    image_coverage_ratio is approximated from the ratio of image bbox area
    to page area when images are present.
    """
    try:
        import pdfplumber
    except ImportError as e:
        raise RuntimeError("pdfplumber is required for PDF parsing") from e

    import io

    pages_data: list[dict[str, Any]] = []

    with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
        for i, page in enumerate(pdf.pages, start=1):
            text: str = page.extract_text() or ""
            char_count = len(text)

            # Approximate image coverage from image bounding boxes
            image_ratio = 0.0
            page_area = (page.width or 1) * (page.height or 1)
            if page_area > 0 and page.images:
                image_area = sum(
                    abs((img.get("x1", 0) - img.get("x0", 0)) * (img.get("y1", 0) - img.get("y0", 0)))
                    for img in page.images
                )
                image_ratio = min(image_area / page_area, 1.0)

            pages_data.append(
                {
                    "page": i,
                    "text": text,
                    "char_count": char_count,
                    "image_coverage_ratio": round(image_ratio, 4),
                }
            )

    return pages_data
