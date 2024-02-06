import json
import os
from xml.etree import ElementTree

"""
users = {
    "admin": {
        "info": {
            "name": "Third Place",
            "ip": "127.0.0.1",
            "email": "admin@example.com",
            "password": "hashed_password1",
            "level": 1,
            "logged_in": True
        },
        "chal": {
            "points": 55,
            "completed": ["chal1", "chal2", "chal3"],
            "last_id": "xxx"
        }
    },  # admin = 3
    "john": {
        "info": {
            "name": "First Place",
            "ip": "127.0.0.2",
            "email": "john@example.com",
            "password": "hashed_password2",
            "level": 1,
            "logged_in": True
        },
        "chal": {
            "points": 250,
            "completed": ["chal1", "chal2", "chal3", "chal4", "chal5", "chal6", "chal7", "chal8"],
            "last_id": "xxx"
        }
    },  # john  = 1
    "doe": {
        "info": {
            "name": "Fourth Place",
            "ip": "127.0.0.3",
            "email": "doe@example.com",
            "password": "hashed_password3",
            "level": 1,
            "logged_in": True
        },
        "chal": {
            "points": 25,
            "completed": ["chal1", "chal2"],
            "last_id": "xxx"
        }
    },  # doe   = 4
    "carb": {
        "info": {
            "name": "Second Place",
            "ip": "127.0.0.4",
            "email": "carb@example.com",
            "password": "hashed_password4",
            "level": 1,
            "logged_in": True
        },
        "chal": {
            "points": 90,
            "completed": ["chal1", "chal2", "chal3", "chal4", "chal5"],
            "last_id": "xxx"
        }
    }   # carb  = 2
}
"""  # example list

INIT_ID = "00000000-0000-0000-0000-000000000000"
DONE_ID = "ffffffff-ffff-ffff-ffff-ffffffffffff"

def get_file_size(n, ar=True):
    units = ['byte', 'KB', 'MB', 'GB', 'TB']

    if ar:
        units = ['بايت', 'كيلوبايت', 'ميقابايت', 'قيقابايت', 'تيرابايت']

    for unit in units:
        if n < 1024.0:
            return "%3.2f %s" % (n, unit)
        n /= 1024.0

class Players:
    def __init__(self, data: dict=None, username: str=None):
        self.data = data
        self.username = username

    def get_username_by_ip(self):
        for username in self.data:
            if self.username == self.data[username]["info"]["ip"]:
                return username

    def get_ip(self):
        return self.data[self.username]["info"]["ip"]

    def get_username(self):
        return self.username

    def get_name(self) -> str:
        return self.data[self.username]["info"]["name"]

    def get_email(self) -> str:
        return self.data[self.username]["info"]["email"]

    def get_password(self) -> str:
        return self.data[self.username]["info"]["password"]

    def get_level(self) -> str:
        return self.data[self.username]["info"]["level"]

    def get_os(self) -> str:
        return self.data[self.username]["info"]["os"]

    def get_loggedin(self) -> bool:
        return self.data[self.username]["info"]["logged_in"]

    def get_banned(self) -> bool:
        return self.data[self.username]["info"]["banned"]


    def get_rank(self) -> int:
        data_copy = self.data.copy()
        data_copy.pop("admin", None)

        formatted = {}

        for uname in data_copy.keys():
            chal = data_copy[uname]["chal"]

            formatted[uname] = {
                "points": chal["points"],
                "completed": chal["completed"]
            }

        formatted = dict(
            sorted(
                formatted.items(),  # ('admin', {'points': 55, 'completed': []})
                key=lambda x: (len(x[1]['completed']), x[1]['points']),
                reverse=True  # default python sort is "ascending"
            )
        )

        formatted = list(formatted.keys())

        return (formatted.index(self.username) + 1)

    def get_first_place(self) -> str:
        data_copy = self.data.copy()
        data_copy.pop("admin", None)

        for username in data_copy:
            player_rank = Players(data=data_copy, username=username).get_rank()
            if player_rank == 1:
                return username


    def get_solved(self) -> list:
        return self.data[self.username]["chal"]["completed"]

    def get_next(self) -> str:
        chals = Challenges().load()
        all_ids = list(chals.keys())

        solved = list(self.get_solved())

        return next((n for n in all_ids if n not in solved), None)

    def get_points(self) -> int:
        return self.data[self.username]["chal"]["points"]

    def get_reward(self) -> int:
        return self.data[self.username]["chal"]["reward"]

    def save(self):
        if self.data:
            with open("data.json", "w") as database:
                return database.write(json.dumps(self.data, indent=4))

    def load(self) -> dict:
        data = {}

        if os.path.exists("data.json"):
            with open("data.json", "r") as database:
                try:
                    data = json.loads(database.read())
                    # for user in list(data.keys()):
                    #     data[user]["info"]["logged_in"] = False
                except:
                    pass

        return data

class Challenges:
    def __init__(self, data: dict=None, id:str=None):
        self.data = data
        self.id = id
        self.chals = self.load()

    def load(self) -> dict:
        if os.path.exists("challenges.json"):
            with open("challenges.json", "r", encoding="utf-8") as database:
                pre_data = database.read()

                if pre_data:
                    data = json.loads(pre_data)
                else:
                    data = {}

            return data
        return {}

    def save(self):
        if self.data:
            with open("challenges.json", "w", encoding="utf-8") as database:
                return database.write(json.dumps(self.data, indent=4, ensure_ascii=False))

    def get_total_reward(self):
        return sum(chal["reward"] for chal in self.load().values())

    def get_name(self) -> str:
        return self.chals[self.id]['name']

    def get_description(self) -> str:
        return self.chals[self.id]['description']

    def get_points(self) -> int:
        return self.chals[self.id]['points']

    def get_attachment(self) -> str:
        return self.chals[self.id]['attachment']

    def get_size(self) -> str:
        attachment = self.get_attachment()
        folder = "static/challenges/"
        if attachment and os.path.exists(folder + attachment) and os.path.isfile(folder + attachment):
            bytes = os.path.getsize(folder + attachment)

            return get_file_size(bytes)

        return "N/A"

    def get_flag(self) -> str:
        return self.chals[self.id]['flag']

    def get_reward(self) -> bool:
        return self.chals[self.id]['reward']

    def get_hints(self) -> bool:
        return self.chals[self.id]['hints']

    def reward(self, username:str, amount:int):
        chals = self.load()
        id = self.id
        chal_reward = Challenges(id=id).get_reward()
        rewarded = False

        if chal_reward:
            enough_reward = chal_reward >= amount

            if enough_reward:
                chal_reward -= amount
                rewarded = True

        if rewarded:
            chals[id]["reward"] = chal_reward
            Challenges(data=chals).save()

            self.data[username]["chal"]["reward"] += amount

            Players(data=self.data).save()

        return rewarded