const password = document.querySelector("form > input.password");

password.addEventListener("mouseenter", function(){
    password.setAttribute("type", "text");
});

password.addEventListener("mouseleave", function(){
    password.setAttribute("type", "password");
});

function preventInvalidChars(event) {
            const input = event.target;
            const regex = new RegExp(input.pattern);
            const value = input.value;
            const filtered = value.match(regex) ? value.match(regex)[0] : '';

            input.value = filtered;
        }