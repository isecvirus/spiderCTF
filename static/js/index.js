const party = function () {
    var duration = 3 * 1000;
    var animationEnd = Date.now() + duration;
    var defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

    function randomInRange(min, max) {
        return Math.random() * (max - min) + min;
    }

    var interval = setInterval(function () {
        var timeLeft = animationEnd - Date.now();

        if (timeLeft <= 0) {
            return clearInterval(interval);
        }

        var particleCount = 50 * (timeLeft / duration);
        // since particles fall down, start a bit higher than random
        confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
        confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
    }, 250);
}

function verify() {
    const flagElem = new FlagMessage();
    const flag = document.getElementsByClassName("flag")[0].value;

    $.ajax({
        type: "POST",
        url: "/verify",
        data: JSON.stringify({ flag: flag }),
        contentType: "application/json",
        success: function (response) {
            if (response["correct"]) {
                flagElem.correct();

                party();

                setTimeout(function () {
                    document.getElementsByClassName("flag")[0].value = "";
                    window.location.reload();
                }, 2500);
            }
            else { flagElem.wrong(); }
        },
        error: function (error) {
            flagElem.error("[ Couldn't submit the flag! ]");
        }
    });
};

class FlagMessage {
    constructor() {
        this.messageTag = document.getElementsByClassName("flag-message")[0];
        this.flagInput = document.getElementsByClassName("flag")[0];
        this.correctFlagMessage = "Correct flag!";
        this.wrongFlagMessage = "Oh, incorrect flag!";
        this.correctFlagColor = "#27CD9E";
        this.wrongFlagColor = "#DD5358";
        this.errorFlagColor = "#FF0000";
        this.messageTag.style.margin = "15px 0 0 0";
    };

    setMessage(msg) {
        this.messageTag.innerText = msg;
    };

    setColor(c) {
        this.messageTag.style.color = c;
    };

    hide() {
        this.setColor("transparent");
        this.setMessage("");
    };

    correct() {
        this.setMessage(this.correctFlagMessage);
        this.setColor(this.correctFlagColor);
        this.flagInput.style.border = "1px solid " + this.correctFlagColor;

        setTimeout((() => {
            this.hide();
            this.flagInput.style.border = "1px solid #cfcfcf";
        }), 2000);
    };

    wrong() {
        this.setMessage(this.wrongFlagMessage);
        this.setColor(this.wrongFlagColor);
        this.flagInput.style.border = "1px solid " + this.wrongFlagColor;

        setTimeout((() => {
            this.hide();
            this.flagInput.style.border = "1px solid #cfcfcf";
        }), 2000);
    };

    error(msg) {
        this.setMessage(msg);
        this.setColor(this.errorFlagColor);
        this.flagInput.style.border = "1px solid #ff0000";

        setTimeout((() => {
            this.hide();
            this.flagInput.style.border = "1px solid #cfcfcf";
        }), 2000);
    };
};

const fetch_downloads = function () {
    const table = document.querySelector(".files table");
    const tableRows = document.querySelectorAll(".files table tbody");
    tableRows.forEach(node => {
        node.parentNode.removeChild(node);
    });

    $.ajax({
        tpye: "GET",
        url: "/fetch-downloads",
        dataType: "json",
        success: function (response) {


            Object.entries(response).forEach(([filename, info]) => {
                const name = info.name;
                const filesize = info.size;
                const filepath = info.path;

                table.innerHTML += `
                    <tr class="file-row">
                        <td>${filename}</td>
                        <td>${filesize}</td>
                        <td>
                            <a class="download-btn" href="${filepath}" download="${name}">
                                <svg xmlns="http://www.w3.org/2000/svg" height="16" width="10" viewBox="0 0 320 512">
                                    <path d="M2 334.5c-3.8 8.8-2 19 4.6 26l136 144c4.5 4.8 10.8 7.5 17.4 7.5s12.9-2.7 17.4-7.5l136-144c6.6-7 8.4-17.2 4.6-26s-12.5-14.5-22-14.5l-72 0 0-288c0-17.7-14.3-32-32-32L128 0C110.3 0 96 14.3 96 32l0 288-72 0c-9.6 0-18.2 5.7-22 14.5z"/>
                                </svg>
                            </a>
                        </td>
                    </tr>`;
            })
        },
        error: function (error) { }
    });
};


function showDownloadManager() {
    fetch_downloads();
    const downloadManager = document.getElementsByClassName("download-window")[0];
    downloadManager.setAttribute("showing", "yes");
};

function hideDownloadManager() {
    const downloadManager = document.getElementsByClassName("download-window")[0];
    downloadManager.setAttribute("showing", "no");
};