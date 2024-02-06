var end = Date.now() + (3 /* seconds */ * 1000 /* m-seconds */);
// go Buckeyes!
var colors = ['#ff0000', '#cfcfcf'];

(function frame() {
    confetti({
        particleCount: 2,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: colors
    });
    confetti({
        particleCount: 2,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: colors
    });

    if (Date.now() < end) {
        requestAnimationFrame(frame);
    }
}());

function sendFeedback() {
    const container = document.getElementsByClassName("feedback-container")[0];
    const feedbackBox = document.getElementsByClassName("feedback")[0];
    const feedbackBtn = document.getElementsByClassName("submit-feedback")[0];
    
    const feedback = feedbackBox.value;
    if (feedback) {
        $.ajax({
            type: "POST",
            url: "/send-feedback",
            data: JSON.stringify({ feedback: feedback }),
            contentType: "application/json",
            success: function (response) {
                if (response.sent) {
                    feedbackBox.value = "";
                    container.style.display = "none";
                }
            },
            error: function (error) {
                // send failed
            }
        });
    }
}