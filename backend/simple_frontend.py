"""Small desktop test client for the FileCooks audio conversion API.

Run from the backend directory with:
    python simple_frontend.py
"""

import json
import mimetypes
import threading
import uuid
from pathlib import Path
from tkinter import BOTH, LEFT, W, Button, Entry, Frame, Label, StringVar, Tk, filedialog, messagebox, ttk
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


API_ROOT = "http://localhost:8000"
API_URL = f"{API_ROOT}/api/audio/convert"
FORMATS_URL = f"{API_ROOT}/api/audio/formats"


def make_multipart(file_path: Path, fields: dict[str, str]) -> tuple[bytes, str]:
    """Build a multipart/form-data body without requiring third-party packages."""
    boundary = f"----FileCooksBoundary{uuid.uuid4().hex}"
    chunks: list[bytes] = []

    for name, value in fields.items():
        chunks.extend(
            [
                f"--{boundary}\r\n".encode(),
                f'Content-Disposition: form-data; name="{name}"\r\n\r\n'.encode(),
                value.encode(),
                b"\r\n",
            ]
        )

    content_type = mimetypes.guess_type(file_path.name)[0] or "application/octet-stream"
    chunks.extend(
        [
            f"--{boundary}\r\n".encode(),
            (
                f'Content-Disposition: form-data; name="file"; '
                f'filename="{file_path.name}"\r\n'
            ).encode(),
            f"Content-Type: {content_type}\r\n\r\n".encode(),
            file_path.read_bytes(),
            b"\r\n",
            f"--{boundary}--\r\n".encode(),
        ]
    )
    return b"".join(chunks), f"multipart/form-data; boundary={boundary}"


class AudioConverterApp:
    def __init__(self, root: Tk):
        self.root = root
        self.root.title("FileCooks - Audio Converter")
        self.root.geometry("600x310")
        self.root.resizable(False, False)

        self.file_path = StringVar()
        self.output_format = StringVar(value="aac")
        self.quality = StringVar(value="high")
        self.bitrate = StringVar(value="192k")
        self.status = StringVar(value="Loading supported formats...")
        self.output_formats = ("aac",)
        self.progress = ttk.Progressbar(root, mode="indeterminate")

        self._build_ui()

    def _build_ui(self):
        container = Frame(self.root, padx=20, pady=18)
        container.pack(fill=BOTH, expand=True)

        Label(container, text="Audio file", anchor="w").pack(fill="x")
        file_row = Frame(container)
        file_row.pack(fill="x", pady=(4, 14))
        Entry(file_row, textvariable=self.file_path, state="readonly").pack(side=LEFT, fill="x", expand=True)
        Button(file_row, text="Browse...", command=self.choose_file).pack(side=LEFT, padx=(8, 0))

        options = Frame(container)
        options.pack(fill="x", pady=(0, 12))
        Label(options, text="Convert to").pack(side=LEFT)
        self.format_combo = ttk.Combobox(
            options, textvariable=self.output_format, values=self.output_formats,
            state="readonly", width=10,
        )
        self.format_combo.pack(side=LEFT, padx=(6, 24))
        Label(options, text="Quality").pack(side=LEFT)
        ttk.Combobox(options, textvariable=self.quality, values=("low", "medium", "high", "best"), state="readonly", width=10).pack(side=LEFT, padx=(6, 24))
        Label(options, text="Bitrate").pack(side=LEFT)
        ttk.Combobox(options, textvariable=self.bitrate, values=("128k", "192k", "256k", "320k"), state="readonly", width=10).pack(side=LEFT, padx=6)

        self.convert_button = Button(container, text="Convert audio", command=self.convert)
        self.convert_button.pack(anchor=W)
        self.progress.pack(fill="x", pady=(14, 8))
        Label(container, textvariable=self.status, anchor="w", fg="#444", wraplength=510).pack(fill="x")
        self.root.after(100, self.load_formats)

    def choose_file(self):
        selected = filedialog.askopenfilename(
            title="Select an audio file",
            filetypes=(("Audio files", "*.mp3 *.wav *.m4a *.aac *.flac *.ogg *.opus *.aiff *.aif *.amr *.ac3 *.wma"), ("All files", "*.*")),
        )
        if selected:
            self.file_path.set(selected)
            self.status.set(f"Ready to convert to {self.output_format.get().upper()}.")

    def load_formats(self):
        """Use the backend registry so the tester stays in sync with the API."""
        try:
            with urlopen(FORMATS_URL, timeout=10) as response:
                formats = json.loads(response.read().decode("utf-8"))
            self.output_formats = tuple(formats.get("output_formats", ()))
            if self.output_formats:
                self.format_combo.configure(values=self.output_formats)
                if self.output_format.get() not in self.output_formats:
                    self.output_format.set(self.output_formats[0])
                self.status.set("Choose an audio file and output format.")
            else:
                self.status.set("The API returned no output formats.")
        except (URLError, OSError, json.JSONDecodeError) as error:
            self.status.set(f"Could not load formats. Is the API running? {error}")

    def convert(self):
        if not self.file_path.get():
            messagebox.showwarning("Select a file", "Please choose an audio file first.")
            return

        path = Path(self.file_path.get())
        if not path.is_file():
            messagebox.showerror("File not found", "The selected file is no longer available.")
            return

        self.convert_button.config(state="disabled")
        self.progress.start(10)
        self.status.set("Uploading and converting...")
        threading.Thread(target=self._convert_in_background, args=(path,), daemon=True).start()

    def _convert_in_background(self, path: Path):
        try:
            body, content_type = make_multipart(
                path,
                {"output_format": self.output_format.get(), "quality": self.quality.get(), "bitrate": self.bitrate.get()},
            )
            request = Request(API_URL, data=body, method="POST", headers={"Content-Type": content_type})
            with urlopen(request, timeout=300) as response:
                result = json.loads(response.read().decode("utf-8"))
            self.root.after(0, self._conversion_succeeded, result, path)
        except HTTPError as error:
            try:
                details = json.loads(error.read().decode("utf-8"))
                message = details.get("error", {}).get("message", str(error))
            except (json.JSONDecodeError, UnicodeDecodeError):
                message = str(error)
            self.root.after(0, self._conversion_failed, message)
        except (URLError, OSError, json.JSONDecodeError) as error:
            self.root.after(0, self._conversion_failed, f"Could not reach the API: {error}")

    def _conversion_succeeded(self, result: dict, source: Path):
        self._reset_controls()
        download_url = result.get("download_url", "")
        self.status.set(f"Conversion complete: {result.get('output_size', 0):,} bytes")
        output_format = result.get("output_format", self.output_format.get()).lower()
        extension = "aif" if output_format == "aiff" else output_format
        destination = filedialog.asksaveasfilename(
            title=f"Save {output_format.upper()} file",
            initialfile=f"{source.stem}.{extension}",
            defaultextension=f".{extension}",
            filetypes=((f"{output_format.upper()} audio", f"*.{extension}"), ("All files", "*.*")),
        )
        if not destination:
            return
        with urlopen(f"{API_ROOT}{download_url}", timeout=60) as response:
            Path(destination).write_bytes(response.read())
        self.status.set(f"Saved: {destination}")
        messagebox.showinfo("Success", "The AAC file was saved successfully.")

    def _conversion_failed(self, message: str):
        self._reset_controls()
        self.status.set(f"Error: {message}")
        messagebox.showerror("Conversion failed", message)

    def _reset_controls(self):
        self.progress.stop()
        self.convert_button.config(state="normal")


if __name__ == "__main__":
    app_root = Tk()
    AudioConverterApp(app_root)
    app_root.mainloop()