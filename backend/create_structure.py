from pathlib import Path

# Root project directory
ROOT = Path(".")

# Directories
directories = [
    "app",
    "app/core",
    "app/db",
    "app/dto",
    "app/routers",
    "app/services",
    "app/tests",
    "app/utils",
]

# Files
files = [
    "app/__init__.py",

    "app/core/__init__.py",
    "app/core/config.py",
    "app/core/logging.py",

    "app/db/__init__.py",
    "app/db/models.py",
    "app/db/session.py",

    "app/dto/__init__.py",

    "app/routers/__init__.py",

    "app/services/__init__.py",

    "app/utils/__init__.py",

    "main.py",
    "README.md",
    "requirements.txt",
]

# Create directories
for directory in directories:
    path = ROOT / directory
    path.mkdir(parents=True, exist_ok=True)

# Create files
for file in files:
    path = ROOT / file
    path.touch(exist_ok=True)

print("✅ Project structure created successfully!")

# Display structure
print("\nProject Structure:")
for directory in directories:
    print(f"├── {directory}/")

print("\nFiles:")
for file in files:
    print(f"├── {file}")