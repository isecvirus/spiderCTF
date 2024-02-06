"""
> SPIDER <
    [VERSION] = v1.1.1
       [v1.0.0][2024-01-11]: First launch (:
       [v1.1.1][yyyy-mm-dd]: * Bugs, * Upgrade, * Change
            New feature:
                1. Hints for challenges
                2. Predefined ton of user profile images
                3. Challenge manager, new/edit/delete + skip
                4. Dynamic points by challenge id
                5. Dynamic certificate generating/certificate-page-route
                5. Traffic statics for admin
                6. Players log verify/signup/login/logout/requests
                7. Hint request by players
            BUGS:
                1. Incorrect challenge refer by id (using next method)
            Change:
                * 1. On server load every user get logged out (now they're not)
            Improve:
                1. Better authentication method
                2. Improve the ranking system
> *** END *** <
"""

import os
import re
import uuid
import ssl
from flask import Flask, request, render_template, redirect, flash, jsonify, abort, url_for
from hashlib import md5

from mimetypes import guess_type
from players import Players, Challenges, get_file_size
from os import urandom
from atexit import register as atexit_register

app = Flask(__name__, template_folder="templates")

UPLOAD_FOLDER = "static/uploads"
FEEDBACK_FOLDER = "feedback"

app.config["SECRET_KEY"] = urandom(32)
app.config['SESSION_TYPE'] = 'filesystem'  # or 'redis'
app.config['SESSION_FILE_DIR'] = 'sessions'  # or 'redis'
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['FEEDBACK_FOLDER'] = FEEDBACK_FOLDER
SSL_CONTEXT = ('cert.pem', 'key.pem')

players_database = Players()
clients = players_database.load()

ADMIN = "admin"

UPLOADED = {}

TRAFFIC = 0
SUSPENDED = False
REWARD = False
CERTIFICATE = False

def updateUploaded():
    global UPLOADED
    copy = {}

    try:
        for filename in os.listdir(UPLOAD_FOLDER):
            file_id = str(uuid.uuid4())
            full_filepath = os.path.join(UPLOAD_FOLDER, filename)
            file_size = get_file_size(os.path.getsize(full_filepath), ar=False)
            file_type = guess_type(full_filepath)

            if not file_type: file_type = "unknown"

            copy[file_id] = {
                "name": filename,
                "size": file_size,
                "type": file_type
            }

        UPLOADED.clear()
        UPLOADED = copy
    except:
        pass
updateUploaded()

def index_render(player: Players):
    challenges = Challenges(data=clients, id=player.get_next())

    if player.get_next():
        return render_template("index.html",
                               name=player.get_name(),
                               points=player.get_points(),
                               rank=player.get_rank(),
                               solved=len(player.get_solved()),
                               player_reward=player.get_reward(),
                               total_chals=len(challenges.load()),

                               traffic=get_file_size(TRAFFIC),
                               ip=request.remote_addr,
                               is_rewards=REWARD,

                               chal_name=challenges.get_name(),
                               chal_description=challenges.get_description(),
                               chal_points=challenges.get_points(),
                               chal_attachment=challenges.get_attachment(),
                               chal_size=challenges.get_size(),
                               chal_reward=challenges.get_reward(),
                               chal_hints=challenges.get_hints(),
                               )

    return render_template("certificate.html", email=player.get_email())


@app.before_request
def before_request():
    global TRAFFIC
    TRAFFIC += int(request.headers.get("content-length") or 0)

    ip = request.remote_addr
    player = Players(clients, username=ip)
    username = player.get_username_by_ip()
    player = Players(clients, username)


    if username:
        if SUSPENDED:
            if username != ADMIN:
                abort(503)  # Service Unavailable

        if player.get_banned():
            abort(403)  # Forbidden

@app.errorhandler(404)
def page_not_found(error):
    return render_template("404.html"), 404

@app.route('/')
def index():
    ip = request.remote_addr

    player = Players(clients, username=ip)
    username = player.get_username_by_ip()


    if username:
        player = Players(clients, username)

        if username == ADMIN and player.get_loggedin():
            return redirect("/dashboard")
        loggedin = player.get_loggedin()

        if not loggedin:
            return redirect("/login")

        return index_render(Players(clients, username=username))
    else:
        return redirect("/signup")

@app.route("/signup", methods=["GET", "POST"])
def signup():
    def safe(s):
        filtered = re.sub(r'[^A-Za-z0-9._@w+]', '', str(s))
        return filtered


    ip = request.remote_addr
    player = Players(clients, username=ip)
    username = player.get_username_by_ip()

    if username:
        player = Players(clients, username)

        if player.get_loggedin():
            return redirect("/")

        flash("لايمكنك تسجيل حساب جديد", "error")
        return redirect("/login")

    if request.method == "POST":
        form = request.form

        name = form["name"]
        username = safe(form["username"])[:8]
        email = safe(form["email"])
        password = md5(form["password"].encode()).hexdigest()
        os = safe(form["os"])
        level = safe(form["level"])


        if username in clients:
            flash("المستخدم موجود بالفعل")
            return redirect("/signup")

        clients[username] = {
            "info": {
                "ip": ip,
                "name": name,
                "email": email,
                "password": password,
                "level": level,
                "os": os,
                "logged_in": True,
                "banned": False
            },
            "chal": {
                "points": 0,
                "completed": [],
                "reward": 0
            }
        }

        Players(data=clients).save()

        return redirect("/")

    return render_template("signup.html")

@app.route("/login", methods=["GET", "POST"])
def login():
    form = request.form
    ip = request.remote_addr

    player_by_ip = Players(clients, username=ip)
    username_by_ip = player_by_ip.get_username_by_ip()

    if request.method == "POST":
        username = form["username"]
        password = md5(form["password"].encode()).hexdigest()
        player = Players(clients, username)


        if username_by_ip:
            if username in clients:
                if password != player.get_password():
                    flash("اسم المستخدم أو كلمة المرور غير صحيحة", "error")
                    return render_template("login.html", username=username)

                clients[username]["info"]['logged_in'] = True
                Players(data=clients).save()

                return redirect("/")

            flash("اسم المستخدم غير موجود!", "error")
            return redirect("/login")

        else:
            return redirect("/signup")

    # if logged in, then route to index
    if username_by_ip in clients:
        if clients[username_by_ip]["info"]["logged_in"]:
            return redirect("/")

    return render_template("login.html")

@app.route("/logout", methods=["POST"])
def logout():
    ip = request.remote_addr
    player = Players(clients, username=ip)
    username = player.get_username_by_ip()

    if username:
        clients[username]["info"]["logged_in"] = False
        Players(data=clients).save()

        return redirect("/login")

@app.route("/verify", methods=["POST"])
def verify():
    ip = request.remote_addr

    player = Players(clients, username=ip)
    username = player.get_username_by_ip()
    player = Players(clients, username)

    if not username:
        return redirect("/signup")

    if request.method == "POST":
        if player.get_loggedin():
            data = request.get_json()
            chal_id = player.get_next()
            user_flag = data["flag"]

            challenge = Challenges(clients, id=chal_id)
            correct_flag = challenge.get_flag()
            is_correct = (user_flag == correct_flag)
            response = {"correct": is_correct}

            if is_correct:
                if challenge.get_reward():
                    c = Challenges(data=clients, id=chal_id)
                    c.reward(username=username, amount=challenge.get_reward())

                clients[username]['chal']['completed'].append(chal_id)
                clients[username]['chal']['points'] += challenge.get_points()

                Players(data=clients).save()

            return jsonify(response)
        return redirect("/login")

@app.route("/dashboard")
def dashboard():
    ip = request.remote_addr

    player = Players(clients, username=ip)
    username = player.get_username_by_ip()
    player = Players(clients, username)

    if username:
        if player.get_loggedin():
            first_place = player.get_first_place()
            data_copy = clients.copy()
            data_copy.pop("admin", None)

            if len(data_copy) > 0:
                last_signup = list(clients.keys())[-1]
            else:
                last_signup = "N/A"

            return render_template("dashboard.html", players_num=max(0, len(data_copy)), banned_num=len(
                [username for username in data_copy if data_copy[username]["info"]["banned"]]),
                                   first_place=first_place if first_place else "N/A", last_signup=last_signup)
        return redirect("/login")

    return redirect("/signup")

@app.route("/get-players", methods=["GET"])
def get_players():
    ip = request.remote_addr

    player = Players(clients, username=ip)
    username = player.get_username_by_ip()
    player = Players(clients, username)

    if username:
        if username == ADMIN and player.get_loggedin():
            filtered = {}

            for username in clients:
                player = Players(data=clients, username=username)

                filtered.setdefault(username, {"info": {}})
                filtered.setdefault(username, {"chal": {}})

                rank = "N/A"
                points = player.get_points() if username != ADMIN else "N/A"
                solved = len(player.get_solved()) if username != ADMIN else "N/A"
                if username != ADMIN:
                    rank = player.get_rank()

                reward = player.get_reward()

                filtered[username]["info"] = {
                    "ip": player.get_ip(),
                    "name": player.get_name(),
                    "email": player.get_email(),
                    "level": player.get_level(),
                    "os": player.get_os(),
                    "rank": rank,
                    "logged_in": player.get_loggedin(),
                    "banned": player.get_banned()
                }
                filtered[username]["chal"] = {
                    "points": points,
                    "completed": solved,
                    "reward": reward
                }

            return jsonify(filtered)

    return redirect("/")

@app.route("/update-players", methods=["GET"])
def update_players():
    ip = request.remote_addr

    player = Players(clients, username=ip)
    username = player.get_username_by_ip()
    player = Players(clients, username)

    if username:
        if username == ADMIN and player.get_loggedin():
            filtered = {}

            for username in clients:
                player = Players(data=clients, username=username)

                filtered.setdefault("players", {}).setdefault(username, {"info": {}, "chal": {}})

                rank = "N/A"
                points = player.get_points() if username != ADMIN else "N/A"
                solved = len(player.get_solved()) if username != ADMIN else "N/A"
                if username != ADMIN:
                    rank = player.get_rank()

                reward = player.get_reward()

                filtered["players"][username]["info"] = {
                    "rank": rank,
                    "logged_in": player.get_loggedin(),
                    "banned": player.get_banned()
                }
                filtered["players"][username]["chal"] = {
                    "points": points,
                    "completed": solved,
                    "reward": reward
                }

                first_place = player.get_first_place()
                data_copy = clients.copy()
                data_copy.pop("admin", None)

                if len(data_copy) > 0:
                    last_signup = list(clients.keys())[-1]
                else:
                    last_signup = "N/A"

                filtered["statistic"] = {
                    "first": first_place,
                    "last": last_signup,
                    "players": max(0, len(data_copy)),
                    "banned": len([username for username in data_copy if data_copy[username]["info"]["banned"]])
                }

            return jsonify(filtered)

    return redirect("/")

@app.route("/ban-player", methods=["POST"])
def ban_player():
    ip = request.remote_addr

    player = Players(clients, username=ip)
    username = player.get_username_by_ip()
    player = Players(clients, username)

    if username:
        if username == ADMIN and player.get_loggedin():
            data = request.get_json()
            username = data["username"]

            data_copy = clients.copy()
            data_copy.pop("admin", None)

            response = {
                "banned": False,
                "banned_num": len([username for username in data_copy if data_copy[username]["info"]["banned"]])
            }

            if username in clients:
                user_player = Players(clients, username)
                clients[username]["info"]["banned"] = False if user_player.get_banned() else True
                response = {"banned": user_player.get_banned()}

            return jsonify(response)
        return redirect("/login")
    return redirect("/signup")

@app.route("/logout-player", methods=["POST"])
def logout_player():
    ip = request.remote_addr

    player = Players(clients, username=ip)
    username = player.get_username_by_ip()
    player = Players(clients, username)

    if username:
        if username == ADMIN and player.get_loggedin():
            data = request.get_json()
            username = data["username"]

            response = {"loggedout": False}

            if username in clients:
                user_player = Players(clients, username)
                clients[username]["info"]["logged_in"] = False if user_player.get_loggedin() else True
                response = {"loggedout": user_player.get_loggedin()}

            return jsonify(response)
        return redirect("/login")
    return redirect("/signup")

@app.route("/delete-player", methods=["POST"])
def delete_player():
    ip = request.remote_addr

    player = Players(clients, username=ip)
    username = player.get_username_by_ip()
    player = Players(clients, username)

    if username:
        if username == ADMIN and player.get_loggedin():
            data = request.get_json()
            username = data["username"]

            clients.pop(username)
            first_place = player.get_first_place()
            data_copy = clients.copy()
            data_copy.pop("admin", None)

            if len(data_copy) > 0:
                last_signup = list(clients.keys())[-1]
            else:
                last_signup = "N/A"

            deleted = username not in clients
            response = {
                "deleted": deleted,
                "first": first_place,
                "last": last_signup,
                "players": max(0, len(data_copy)),
                "banned": len([username for username in data_copy if data_copy[username]["info"]["banned"]])
            }

            if deleted:
                Players(data=clients).save()
            return jsonify(response)
        return redirect("/login")
    return redirect("/signup")

@app.route("/save", methods=["POST"])
def save():
    ip = request.remote_addr

    player = Players(clients, username=ip)
    username = player.get_username_by_ip()
    player = Players(clients, username)

    if username:
        if username == ADMIN and player.get_loggedin():
            written = Players(data=clients).save()
            response = {"saved": True if written else False}

            return jsonify(response)
        return redirect("/login")
    return redirect("/signup")

@app.route("/suspend", methods=["POST"])
def suspend():
    global SUSPENDED
    ip = request.remote_addr

    player = Players(clients, username=ip)
    username = player.get_username_by_ip()
    player = Players(clients, username)

    if username:
        if username == ADMIN and player.get_loggedin():
            is_suspended = True if not SUSPENDED else False
            SUSPENDED = is_suspended
            response = {"suspended": is_suspended}

            return jsonify(response)
        return redirect("/login")
    return redirect("/signup")

@app.route("/uploads", methods=["POST"])
def upload():

    ip = request.remote_addr
    player = Players(clients, username=ip)
    username = player.get_username_by_ip()
    player = Players(clients, username)

    if username:
        if username == ADMIN and player.get_loggedin():
            file = request.files["file"]

            if file:
                filename = file.filename
                full_filepath = os.path.join(UPLOAD_FOLDER, filename)
                file.save(full_filepath)

                updateUploaded()
                return jsonify({"uploaded": True})
            else:
                return jsonify({"uploaded": False})

    return redirect("/")

@app.route("/delete-uploads", methods=["POST"])
def delete_upload():

    ip = request.remote_addr
    player = Players(clients, username=ip)
    username = player.get_username_by_ip()
    player = Players(clients, username)

    if username:
        if username == ADMIN and player.get_loggedin():
            fileid = request.get_json()["id"]

            if fileid in UPLOADED:
                filename = UPLOADED[fileid]["name"]
                full_filepath = os.path.join(UPLOAD_FOLDER, filename)

                UPLOADED.pop(fileid)

                if os.path.exists(full_filepath):
                    os.remove(full_filepath)

                return jsonify({"deleted": True})
            else:
                return jsonify({"deleted": False})

    return redirect("/")

@app.route("/fetch-uploads", methods=["GET"])
def fetch_uploads():
    ip = request.remote_addr

    player = Players(clients, username=ip)
    username = player.get_username_by_ip()
    player = Players(clients, username)

    if username:
        if username == ADMIN and player.get_loggedin():
            updateUploaded()

            return jsonify(UPLOADED)

    return redirect("/")

@app.route("/fetch-downloads", methods=["GET"])
def fetch_downloads():
    ip = request.remote_addr

    player = Players(clients, username=ip)
    username = player.get_username_by_ip()
    player = Players(clients, username)

    if username:
        if player.get_loggedin():
            FILES = {}
            for filename in os.listdir(UPLOAD_FOLDER):
                path = url_for("static", filename=f"uploads/{filename}")
                full_filepath = os.path.join(UPLOAD_FOLDER, filename)
                file_size = get_file_size(os.path.getsize(full_filepath), ar=True)

                FILES[filename] = {
                    "name": filename,
                    "path": path,
                    "size": file_size
                }

            return jsonify(FILES)

    return redirect("/")

@app.route("/send-feedback", methods=["POST"])
def send_feedback():
    ip = request.remote_addr

    player = Players(clients, username=ip)
    username = player.get_username_by_ip()
    player = Players(clients, username)

    if username:
        if player.get_loggedin():
            feedback = request.get_json()["feedback"]

            os.makedirs(FEEDBACK_FOLDER, exist_ok=True)
            os.makedirs(os.path.join(FEEDBACK_FOLDER, username), exist_ok=True)

            feedback_id = str(uuid.uuid4())
            path = f"{FEEDBACK_FOLDER}/{username}/{feedback_id}.txt"

            with open(path, "w", encoding="utf-8") as feedback_file:
                saved = feedback_file.write(feedback)

            is_saved = True if saved else False

            # if saved then set the feedback to true
            clients[username]["info"]["feedback"] = is_saved

            return jsonify({"sent": is_saved})
        return redirect("/login")
    return redirect("/signup")

def exit_call():  # ServerCloseListener
    app.logger.debug("*" + ("-=" * 10) + "[ TERMINATING ]" + ("=-" * 10) + "*")

if os.environ.get("WERKZEUG_RUN_MAIN") != "true":
    atexit_register(exit_call)

if __name__ == '__main__':
    # context = ssl.SSLContext(ssl.PROTOCOL_TLSv1_2)
    # context.load_cert_chain(certfile="TLS/certificate.crt", keyfile="TLS/private.key")

    app.run(host="0.0.0.0", port=80, debug=True)  # ssl_context=context
