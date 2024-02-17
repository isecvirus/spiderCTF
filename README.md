# spiderCTF
spiderCTF is a CTF management system for college/school hacking events

### challenges format in challenges.json:
```json
{
    "Challenge id e.g. 00000000-0000-0000-0000-000000000000": {
        "id": "Challenge id e.g. 00000000-0000-0000-0000-000000000000",
        "name": "Challenge title",
        "description": "Challenge description",
        "points": 0,
        "attachment": "path/to/file.any or null for no attachment",
        "flag": "The challenge flag, can be empty or in any form even if differ from other challeneges",
        "reward": 0,
        "hints": ["Not working for v1.0.0"],
        "note": "Note for admin"
    }
}
```

### flask python server:
```bash
pip3 install flask
pip3 install psutil
```

### running the server:
```bash
python3 server.py
```
