"""Application-level exceptions and their JSON error envelope.

Every route error should raise (or be translated to) an ``AppError``
subclass so the API always returns the consistent shape:

    {"success": false, "error": {"code": "...", "message": "..."}}
"""

from fastapi import status


class AppError(Exception):
    code = "APP_ERROR"
    status_code = status.HTTP_400_BAD_REQUEST
    default_message = "An unexpected error occurred."

    def __init__(self, message: str | None = None):
        self.message = message or self.default_message
        super().__init__(self.message)


class UnsupportedFormatError(AppError):
    code = "UNSUPPORTED_FORMAT"
    status_code = status.HTTP_400_BAD_REQUEST
    default_message = "The uploaded audio format is not supported."


class InvalidOutputFormatError(AppError):
    code = "INVALID_OUTPUT_FORMAT"
    status_code = status.HTTP_400_BAD_REQUEST
    default_message = "The requested output format is not supported."


class InvalidFileError(AppError):
    code = "INVALID_FILE"
    status_code = status.HTTP_400_BAD_REQUEST
    default_message = "The uploaded file is invalid or corrupted."


class InvalidParameterError(AppError):
    code = "INVALID_PARAMETER"
    status_code = status.HTTP_400_BAD_REQUEST
    default_message = "One or more request parameters are invalid."


class FileTooLargeError(AppError):
    code = "FILE_TOO_LARGE"
    status_code = status.HTTP_413_CONTENT_TOO_LARGE

    def __init__(self, max_mb: int | None = None):
        message = f"File exceeds the maximum allowed size of {max_mb} MB." if max_mb else "File is too large."
        super().__init__(message)


class FFmpegUnavailableError(AppError):
    code = "FFMPEG_UNAVAILABLE"
    status_code = status.HTTP_503_SERVICE_UNAVAILABLE
    default_message = "FFmpeg is not available on the server. Audio processing is temporarily disabled."


class ConversionFailedError(AppError):
    code = "CONVERSION_FAILED"
    status_code = status.HTTP_500_INTERNAL_SERVER_ERROR
    default_message = "The audio conversion failed."


class ConversionTimeoutError(AppError):
    code = "CONVERSION_TIMEOUT"
    status_code = status.HTTP_504_GATEWAY_TIMEOUT
    default_message = "The audio conversion timed out."


class ResourceNotFoundError(AppError):
    code = "NOT_FOUND"
    status_code = status.HTTP_404_NOT_FOUND
    default_message = "The requested resource was not found."


class MissingVideoStreamError(AppError):
    code = "MISSING_VIDEO_STREAM"
    status_code = status.HTTP_400_BAD_REQUEST
    default_message = "The uploaded file does not contain a video stream."


class MissingAudioStreamError(AppError):
    code = "MISSING_AUDIO_STREAM"
    status_code = status.HTTP_400_BAD_REQUEST
    default_message = "The uploaded file does not contain an audio stream."


class VideoTooLongError(AppError):
    code = "VIDEO_TOO_LONG"
    status_code = status.HTTP_400_BAD_REQUEST

    def __init__(self, max_seconds: int | None = None):
        message = (
            f"Video duration exceeds the maximum allowed length of {max_seconds} seconds."
            if max_seconds else "Video is too long."
        )
        super().__init__(message)


class UnsupportedCodecError(AppError):
    code = "UNSUPPORTED_CODEC"
    status_code = status.HTTP_400_BAD_REQUEST
    default_message = "The requested codec is not supported by the installed FFmpeg build."


class JobCancelledError(AppError):
    code = "JOB_CANCELLED"
    status_code = status.HTTP_409_CONFLICT
    default_message = "The job was cancelled."


class JobNotCancellableError(AppError):
    code = "JOB_NOT_CANCELLABLE"
    status_code = status.HTTP_409_CONFLICT
    default_message = "The job has already finished and cannot be cancelled."


# --- PDF ---------------------------------------------------------------------

class PDFInvalidError(AppError):
    code = "PDF_INVALID"
    status_code = status.HTTP_400_BAD_REQUEST
    default_message = "The uploaded file is not a valid PDF."


class PDFEncryptedError(AppError):
    code = "PDF_ENCRYPTED"
    status_code = status.HTTP_400_BAD_REQUEST
    default_message = "The PDF is encrypted. Supply a password to access its contents."


class PDFPasswordError(AppError):
    code = "PDF_PASSWORD_ERROR"
    status_code = status.HTTP_400_BAD_REQUEST
    default_message = "The supplied password is missing or incorrect."


class PDFPageNotFoundError(AppError):
    code = "PDF_PAGE_NOT_FOUND"
    status_code = status.HTTP_404_NOT_FOUND
    default_message = "Requested page does not exist."


class PDFProcessingError(AppError):
    code = "PDF_PROCESSING_FAILED"
    status_code = status.HTTP_500_INTERNAL_SERVER_ERROR
    default_message = "PDF processing failed."


class PDFSignatureError(AppError):
    code = "PDF_SIGNATURE_ERROR"
    status_code = status.HTTP_400_BAD_REQUEST
    default_message = "The PDF signature operation failed."


class PDFFormError(AppError):
    code = "PDF_FORM_ERROR"
    status_code = status.HTTP_400_BAD_REQUEST
    default_message = "The PDF form operation failed."


class PDFUnsupportedFeatureError(AppError):
    code = "PDF_UNSUPPORTED_FEATURE"
    status_code = status.HTTP_400_BAD_REQUEST
    default_message = "This PDF uses a feature that isn't supported."


class PDFValidationError(AppError):
    code = "PDF_VALIDATION_ERROR"
    status_code = status.HTTP_400_BAD_REQUEST
    default_message = "One or more PDF request parameters are invalid."


class PDFTooManyPagesError(AppError):
    code = "PDF_TOO_MANY_PAGES"
    status_code = status.HTTP_400_BAD_REQUEST

    def __init__(self, max_pages: int | None = None):
        message = (
            f"PDF exceeds the maximum allowed page count of {max_pages}." if max_pages else "PDF has too many pages."
        )
        super().__init__(message)
