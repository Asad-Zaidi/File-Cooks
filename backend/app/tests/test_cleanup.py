import os
import time

from app.utils.files import cleanup_expired_files


def test_cleanup_removes_only_expired_files(tmp_path):
    old_file = tmp_path / "old.tmp"
    new_file = tmp_path / "new.tmp"
    old_file.write_bytes(b"x")
    new_file.write_bytes(b"x")

    old_mtime = time.time() - (48 * 3600)  # 48 hours old
    os.utime(old_file, (old_mtime, old_mtime))

    removed = cleanup_expired_files(tmp_path, max_age_hours=24)

    assert removed == 1
    assert not old_file.exists()
    assert new_file.exists()


def test_cleanup_on_missing_directory_is_a_noop(tmp_path):
    missing_dir = tmp_path / "does_not_exist"
    assert cleanup_expired_files(missing_dir, max_age_hours=1) == 0
