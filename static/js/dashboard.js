let isHidden = false;
// hideable SAFE_FIELDS for users privacy
const SAFE_FIELDS = ["username", "email", "ip"];
const SAFE_FIELD_KEYWORD = "safe";
const ONLINE = "Online";
const OFFLINE = "Offline";
const BANNED = "Banned";
const ADMIN = "admin";
const BAN_COLOR = "#ffd700";
const BAN_HOVER_COLOR = "#ffd70021";
const LOGOUT_COLOR = "#8800ff21";
const LOGOUT_HOVER_COLOR = "#8800ff";
const DELETE_COLOR = "#ff0000";
const DELETE_HOVER_COLOR = "#ff000021";


function hide() {
    SAFE_FIELDS.forEach((field) => {
        let field_element = document.getElementsByClassName(field)
        for (i = 0; i < field_element.length; i++) {
            if (isHidden) {
                field_element[i].removeAttribute(SAFE_FIELD_KEYWORD);
            } else {
                field_element[i].setAttribute(SAFE_FIELD_KEYWORD, null);
            }
        };
    })

    if (isHidden) {
        document.getElementsByClassName("safe-data")[0].removeAttribute("safe");
    } else {
        document.getElementsByClassName("safe-data")[0].setAttribute("safe", "");
    }

    isHidden = true ? !isHidden : false;
}

function save() {
    $.ajax({
        type: "POST",
        url: "/save",
        data: JSON.stringify({}),
        contentType: "application/json",
        success: function (response) {
            if (response["saved"]) { alert("Saved!"); };
        },
        error: function (error) {
            // ban failed
        }
    });
}

let isAutomate = false;
function autoUpdatePlayers() {
    const AUTOMATE = "automate";
    if (isAutomate) {
        document.getElementsByClassName("auto-update-players")[0].removeAttribute(AUTOMATE);
        isAutomate = false;
    } else {
        document.getElementsByClassName("auto-update-players")[0].setAttribute(AUTOMATE, "");
        isAutomate = true;
    }
};

function getColorFromPercentage(percentage) {
    // Convert percentage to a value between 0 and 1
    const normalizedPercentage = percentage / 100;

    // Calculate the RGB values based on the percentage
    const red = Math.round((1 - normalizedPercentage) * 255);
    const green = Math.round(normalizedPercentage * 255);
    const blue = 0;

    // Convert the RGB values to hexadecimal format
    const color = `#${red.toString(16).padStart(2, '0')}${green.toString(16).padStart(2, '0')}${blue.toString(16).padStart(2, '0')}`;

    return color;
}

(function () {
    const timerSVG = document.getElementsByClassName("timer-svg")[0];

    let start = new Date();
    start.setHours(15, 0, 0);
    start = start.getTime();

    let end = new Date();
    end.setHours(18, 0, 0);
    end = end.getTime();

    const updateTime = function () {
        const current = new Date().getTime();
        let estimated = end - current;

        // exit the execution if ended
        if (end < current) return;

        const all = end - start;
        const percent = ((estimated / all) * 100).toFixed(0);
        const color = getColorFromPercentage(percent);

        timerSVG.style.fill = `${color}`;
        timerSVG.style.filter = `drop-shadow(0 0 5px ${color}a9)`;
        timerSVG.style.backgroundColor = `${color}21`;
        timerSVG.style.border = `1px solid ${color}`;

        const countdown = new Date(estimated);
        const hours = countdown.getUTCHours();
        const miutes = countdown.getUTCMinutes();
        const seconds = countdown.getUTCSeconds();

        const formatted = `${hours.toString().padStart(2, '0')}:${miutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`

        document.querySelector(".time-left").innerText = formatted;

        estimated -= 1000;
    }

    /*
        if the current time is in the range or more that
        the start of the event time, then start counting
        since it's started (:
    */
    if (Date.now() >= start) {
        updateTime();

        let checkLoop = setInterval(function () {
            updateTime();

            if (end <= Date.now()) { // time's up
                clearInterval(checkLoop);
            }
        }, 1000);
    }
})();

function banUser(btn, username) {
    if (confirm(`Un/ban ${username}`) === false) return;

    $.ajax({
        type: "POST",
        url: "/ban-player",
        data: JSON.stringify({ username: username }),
        contentType: "application/json",
        success: function (response) {
            if (response["banned"]) {
                btn.setAttribute("banned", "");
            } else {
                btn.removeAttribute("banned");
            }
        },
        error: function (error) {
            // ban failed
        }
    });
};

function logoutUser(btn, username) {
    if (confirm(`Login/out ${username}`) === false) return;

    $.ajax({
        type: "POST",
        url: "/logout-player",
        data: JSON.stringify({ username: username }),
        contentType: "application/json",
        success: function (response) {
            const loggedout = response["loggedout"];

            if (loggedout) {
                btn.setAttribute("loggedout", "");
            } else {
                btn.removeAttribute("loggedout");
            }
        },
        error: function (error) {
            // logout failed
        }
    });
};

function deleteUser(username) {
    if (confirm(`Delete ${username}`) === false) return;

    $.ajax({
        type: "POST",
        url: "/delete-player",
        data: JSON.stringify({ username: username }),
        contentType: "application/json",
        success: function (response) {
            const deleted = response["deleted"];
            const first = response["first"];
            const last = response["last"];
            const players = response["players"];
            const banned = response["banned"];

            if (deleted) {
                document.getElementById(`${username}-row`).remove();
                delete clients.username;

                document.querySelector(".players-num").innerText = players;
                document.querySelector(".banned-num").innerText = banned;
                document.querySelector(".first-place").innerText = first;
                document.querySelector(".last-signup").innerText = last;
            }
        },
        error: function (error) {
            // deletion failed
        }
    });
};

let clients = {};

function updateStatistics(data) {
    const first = data["first"];
    const last = data["last"];
    const players = data["players"];
    const banned = data["banned"];

    document.querySelector(".players-num").innerText = players;
    document.querySelector(".banned-num").innerText = banned;
    document.querySelector(".first-place").innerText = first;
    document.querySelector(".last-signup").innerText = last;

}

function getPlayers(event) {
    $.ajax({
        tpye: "GET",
        url: "/get-players",
        dataType: "json",
        success: function (response) {

            Object.entries(response).forEach(([username, data]) => {
                if (Object.keys(clients).includes(username)) return;

                const name = data["info"]["name"];
                const email = data["info"]["email"];
                const ip = data["info"]["ip"];
                const level = data["info"]["level"];
                const os = data["info"]["os"];
                let rank = data["info"]["rank"];

                let status = null;
                if (data["info"]["logged_in"] && !(data["info"]["banned"])) {
                    status = ONLINE;
                } else if (!(data["info"]["logged_in"]) && !(data["info"]["banned"])) {
                    status = OFFLINE;
                } else if (data["info"]["banned"]) {
                    status = BANNED;
                }

                const points = data["chal"]["points"];
                const chals = data["chal"]["completed"];
                const reward = data["chal"]["reward"];

                // Disable Admin Control (so that even admin can't ban/logout/delete his account)
                const DAC = (username == ADMIN ? 'disabled' : '');
                const BANNED = (data["info"]["banned"] ? 'banned' : '');
                const LOGGEDOUT = (!data["info"]["logged_in"] ? 'loggedout' : '');

                let new_element = `
                <tbody id="${username}-row" class="player-row">
                    <td>${name}</td>
                    <td class="username">${username}</td>
                    <td class="email">${email}</td>
                    <td class="ip">${ip}</td>
                    <td>${level}</td>
                    <td>${os}</td>
                    <td class="${username}-status">${status}</td>
                    <td class="${username}-rank">${rank}</td>
                    <td class="${username}-chals">${chals}</td>
                    <td class="${username}-points">${points}</td>
                    <td class="${username}-reward">${reward}</td>
                `;

                new_element += `
                    <td class="controller">
                        <button ${DAC} ${BANNED} name="${username}" id="${username}-ban" title="Forbid the user from accessing the website" onclick="banUser(this, '${username}')" class="control-ban" style="--bg: ${BAN_HOVER_COLOR}; --fg: ${BAN_COLOR};">
                            <svg xmlns="http://www.w3.org/2000/svg" height="16" width="16" viewBox="0 0 512 512">
                                <path
                                    d="M367.2 412.5L99.5 144.8C77.1 176.1 64 214.5 64 256c0 106 86 192 192 192c41.5 0 79.9-13.1 111.2-35.5zm45.3-45.3C434.9 335.9 448 297.5 448 256c0-106-86-192-192-192c-41.5 0-79.9 13.1-111.2 35.5L412.5 367.2zM0 256a256 256 0 1 1 512 0A256 256 0 1 1 0 256z" />
                            </svg>
                        </button>
                        <button ${DAC} ${LOGGEDOUT} name="${username}" id="${username}-logout" title="Start/End the user session (Login/out)" onclick="logoutUser(this, '${username}')" class="control-logout" style="--bg: ${LOGOUT_HOVER_COLOR}; --fg: ${LOGOUT_COLOR};">
                            <svg xmlns="http://www.w3.org/2000/svg" height="16" width="16" viewBox="0 0 512 512">
                                <path
                                    d="M502.6 278.6c12.5-12.5 12.5-32.8 0-45.3l-128-128c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3L402.7 224 192 224c-17.7 0-32 14.3-32 32s14.3 32 32 32l210.7 0-73.4 73.4c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0l128-128zM160 96c17.7 0 32-14.3 32-32s-14.3-32-32-32L96 32C43 32 0 75 0 128L0 384c0 53 43 96 96 96l64 0c17.7 0 32-14.3 32-32s-14.3-32-32-32l-64 0c-17.7 0-32-14.3-32-32l0-256c0-17.7 14.3-32 32-32l64 0z" />
                            </svg>
                        </button>
                        <button ${DAC} name="${username}" title="Delete the user" onclick="deleteUser('${username}')" class="control-delete" style="--bg: ${DELETE_HOVER_COLOR}; --fg: ${DELETE_COLOR};">
                            <svg xmlns="http://www.w3.org/2000/svg" height="16" width="14" viewBox="0 0 448 512">
                                <path
                                    d="M170.5 51.6L151.5 80h145l-19-28.4c-1.5-2.2-4-3.6-6.7-3.6H177.1c-2.7 0-5.2 1.3-6.7 3.6zm147-26.6L354.2 80H368h48 8c13.3 0 24 10.7 24 24s-10.7 24-24 24h-8V432c0 44.2-35.8 80-80 80H112c-44.2 0-80-35.8-80-80V128H24c-13.3 0-24-10.7-24-24S10.7 80 24 80h8H80 93.8l36.7-55.1C140.9 9.4 158.4 0 177.1 0h93.7c18.7 0 36.2 9.4 46.6 24.9zM80 128V432c0 17.7 14.3 32 32 32H336c17.7 0 32-14.3 32-32V128H80zm80 64V400c0 8.8-7.2 16-16 16s-16-7.2-16-16V192c0-8.8 7.2-16 16-16s16 7.2 16 16zm80 0V400c0 8.8-7.2 16-16 16s-16-7.2-16-16V192c0-8.8 7.2-16 16-16s16 7.2 16 16zm80 0V400c0 8.8-7.2 16-16 16s-16-7.2-16-16V192c0-8.8 7.2-16 16-16s16 7.2 16 16z" />
                            </svg>
                        </button>
                    </td>
                </tbody>`;

                document.querySelector(".players-table table").innerHTML += new_element;

            });

            clients = response;
        },
        error: function (error) {
            console.error(`[-] Error while getting data: ${error}`);
        }
    });
};

// get-players
$(document).ready(function () {
    getPlayers();
});

// update-players
$(document).ready(function () {
    function update() {
        if (!document.querySelectorAll("tbody").length || !isAutomate) return

        $.ajax({
            tpye: "GET",
            url: "/update-players",
            dataType: "json",
            success: function (response) {
                Object.entries(response["players"]).forEach(([username, data]) => {
                    let status = null;

                    const rank = data["info"]["rank"];
                    const banned = data["info"]["banned"];
                    const logged_in = data["info"]["logged_in"];

                    document.getElementsByClassName(`${username}-rank`)[0].innerText = rank;

                    if (logged_in && !(banned)) {
                        status = ONLINE;
                    } else if (!(logged_in) && !(banned)) {
                        status = OFFLINE;
                    } else if (banned) {
                        status = BANNED;
                    }

                    const points = data["chal"]["points"];
                    const chals = data["chal"]["completed"];
                    const reward = data["chal"]["reward"];
                    const statusElement = document.getElementsByClassName(`${username}-status`)[0];
                    const pointsElement = document.getElementsByClassName(`${username}-points`)[0];
                    const chalsElement = document.getElementsByClassName(`${username}-chals`)[0];
                    const rewardElement = document.getElementsByClassName(`${username}-reward`)[0];

                    if (statusElement && pointsElement && chalsElement && rewardElement) {
                        statusElement.innerText = status;
                        pointsElement.innerText = points;
                        chalsElement.innerText = chals;
                        rewardElement.innerText = reward;
                    };

                    const ban_btn = document.getElementById(`${username}-ban`)
                    if (data["info"]["banned"]) {
                        ban_btn.setAttribute("banned", "");
                    } else {
                        ban_btn.removeAttribute("banned");
                    }

                    const logout_btn = document.getElementById(`${username}-logout`)
                    if (!data["info"]["logged_in"]) {
                        logout_btn.setAttribute("loggedout", "");
                    } else {
                        logout_btn.removeAttribute("loggedout");
                    }

                    updateStatistics(response["statistic"]);
                });
            },
            error: function (error) {
                console.error(`[-] Error while updating data: ${error}`);
                clearInterval(worker);
            }
        });
    };

    update();

    let worker = setInterval(update, 1000);
});

const fetch_uploads = function () {
    $.ajax({
        tpye: "GET",
        url: "/fetch-uploads",
        dataType: "json",
        success: function (response) {

            const table = document.querySelector(".files table");
            const tableRows = document.querySelectorAll(".files table tbody");
            tableRows.forEach(node => {
                node.parentNode.removeChild(node);
            });

            Object.entries(response).forEach(([id, info]) => {
                const filename = info.name;
                const file_type = info.type;
                const file_size = info.size;

                table.innerHTML += `
                    <tr id="${id}" class="file-row">
                        <td>${filename}</td>
                        <td>${file_type}</td>
                        <td>${file_size}</td>
                        <td>
                            <svg class="delete-upload" onclick="deleteUploaded('${id}')" xmlns="http://www.w3.org/2000/svg" height="16" width="14" viewBox="0 0 448 512">
                                <path d="M135.2 17.7L128 32H32C14.3 32 0 46.3 0 64S14.3 96 32 96H416c17.7 0 32-14.3 32-32s-14.3-32-32-32H320l-7.2-14.3C307.4 6.8 296.3 0 284.2 0H163.8c-12.1 0-23.2 6.8-28.6 17.7zM416 128H32L53.2 467c1.6 25.3 22.6 45 47.9 45H346.9c25.3 0 46.3-19.7 47.9-45L416 128z" />
                            </svg>
                        </td>
                    </tr>`;
            })
        },
        error: function (error) { }
    });
};

function showUploadManager() {
    fetch_uploads();
    const uploadManager = document.getElementsByClassName("upload-window")[0];
    uploadManager.setAttribute("showing", "yes");
};

function hideUploadManager() {
    const uploadManager = document.getElementsByClassName("upload-window")[0];
    uploadManager.setAttribute("showing", "no");
};

function deleteUploaded(id) {
    if (confirm(`Delete '${id}'?`) === false) return;

    $.ajax({
        type: "POST",
        url: "/delete-uploads",
        data: JSON.stringify({ id: id }),
        contentType: "application/json",
        success: function (response) {
            if (response.deleted) {
                alert(`File '${id}' was deleted!`);
                document.getElementById(id).remove();
            }
        },
        error: function (error) {
            // delete failed
        }
    });
};

$(document).ready(fetch_uploads())


const uploadBtn = document.getElementsByClassName("fileupload-btn")[0];
const closeBtn = document.getElementsByClassName("close-upload-window")[0];

uploadBtn.addEventListener("click", function (event) {
    event.preventDefault();

    const fileInput = document.getElementById("filechoose");

    if (!fileInput.files.length) return;

    uploadBtn.setAttribute("uploading", "");
    closeBtn.setAttribute("disabled", "");

    const file = fileInput.files[0];
    const fileData = new FormData();
    fileData.append("file", file);

    const filename = file.name;
    const progress = document.getElementsByClassName("upload-progress")[0];

    $.ajax({
        type: "POST",
        url: "/uploads",
        data: fileData,
        processData: false, // Prevent jQuery from processing the data
        contentType: false, // Prevent jQuery from setting the content type
        xhr: function () {
            xhr = new window.XMLHttpRequest();
            xhr.upload.addEventListener("progress", function (e) {
                if (e.lengthComputable) {
                    const percent = Math.round((e.loaded / e.total) * 100);
                    progress.value = percent;
                }
            }, false);

            return xhr;
        },
        success: function (response) {
            if (response.uploaded) {
                alert(`File '${filename}' uploaded!`);
            }
            progress.value = 0;
            uploadBtn.removeAttribute("uploading");
            closeBtn.removeAttribute("disabled");
            fileInput.value = "";
        },
        error: function (error) {
            progress.value = 0;
            uploadBtn.removeAttribute("uploading");
            closeBtn.removeAttribute("disabled");
            fileInput.value = "";
        }
    });
});


function suspend() {
    const element = document.getElementsByClassName("suspend")[0];

    $.ajax({
        type: "POST",
        url: "/suspend",
        data: JSON.stringify({}),
        contentType: "application/json",
        success: function (response) {
            if (response["suspended"]) {
                element.setAttribute("suspended", "");
            } else {
                element.removeAttribute("suspended");
            }
        },
        error: function (error) {
            // ban failed
        }
    });
}