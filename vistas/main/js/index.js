// Configuramos las variables
var uuid = generateUUID();
var messages = [];
var models = [
    { "model": "gpt-4o-mini", "source": "openai" },
    { "model": "gpt-4o", "source": "openai" },
    { "model": "llama-3.2-90b-vision-preview", "source": "groq" },
    { "model": "gemini-2.0-flash-exp", "source": "google" }
]
var model = {};
const chatBox = document.getElementById('chatBox');
const messageInput = document.getElementById('messageInput');
var config = {};
var responding = false;
var username = "";
var chats = [];

var botonSeleccionar = document.getElementById('FileButton');
var botonScreenshot = document.getElementById('ScreenshotButton');
var selectorArchivo = document.getElementById('selectorArchivo');

var images_container = document.querySelector(".images_container");
var images = [];
//messageInput.focus();

function setApiKeys() {
    var openaiKEYObject = document.querySelector(".openai-key");
    var groqKEYObject = document.querySelector(".groq-key");
    var geminiKEYObject = document.querySelector(".gemini-key");
    var proxyAddressObject = document.querySelector(".proxy-address");
    var out = {
        OPENAI_API_KEY: openaiKEYObject.value,
        API_KEY_GROQ: groqKEYObject.value,
        GOOGLE_API_KEY: geminiKEYObject.value,
        PROXY: proxyAddressObject.value
    }
    fetch("http://127.0.0.1:7070/set-keys", {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(out),
    });
}



async function getApiKeys() {
    var pet = await fetch("http://127.0.0.1:7070/get-keys", { method: 'GET' });
    var res = await pet.json();
    if (res) {
        var openaiKEYObject = document.querySelector(".openai-key");
        var groqKEYObject = document.querySelector(".groq-key");
        var geminiKEYObject = document.querySelector(".gemini-key");
        var proxyAddressObject = document.querySelector(".proxy-address");

        openaiKEYObject.value = res.OPENAI_API_KEY
        groqKEYObject.value = res.API_KEY_GROQ
        geminiKEYObject.value = res.GOOGLE_API_KEY
        proxyAddressObject.value = res.PROXY
    }
}

getApiKeys();

botonSeleccionar.addEventListener('click', () => {
    selectorArchivo.click();
});

botonScreenshot.addEventListener('click', () => {
    var xhr = new XMLHttpRequest();
    xhr.open("get", "http://127.0.0.1:7070/screenshot");
    xhr.responseType = 'blob';
    xhr.onload = () => {
        const reader = new FileReader();
        reader.onloadend = function () {
            const base64data = reader.result;
            // Usamos una función para manejar el recorte de la imagen
            handleImageCrop(base64data, xhr.response);
        };
        reader.readAsDataURL(xhr.response); // Leer como URL de datos
    };
    xhr.send();
});


function handleImageCrop(base64data, blobImage) {

    // Crear un modal o contenedor para la imagen
    const modal = document.createElement('div');
    modal.style.position = 'fixed';
    modal.style.top = '0';
    modal.style.left = '0';
    modal.style.width = '100%';
    modal.style.height = '100%';
    modal.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    modal.style.display = 'flex';
    modal.style.alignItems = 'center';
    modal.style.justifyContent = 'center';
    document.body.appendChild(modal);


    const imageElement = document.createElement('img');
    imageElement.src = base64data;
    modal.appendChild(imageElement);

    const cropper = new Cropper(imageElement, {
        aspectRatio: NaN, // Permite cualquier aspecto
        viewMode: 1, //Permite mover el canvas dentro del contenedor
        zoomable: true, // Permite zoom con la rueda del ratón
        preview: null,
        autoCrop: false,
    });

    // Crear botón para confirmar el recorte
    const cropButton = document.createElement('button');
    cropButton.classList.add("cropbutton");
    cropButton.innerText = 'Recortar';
    cropButton.style.position = 'absolute';
    cropButton.style.top = '20px';
    cropButton.style.right = '20px';
    modal.appendChild(cropButton);

    // Crear botón para cancelar el recorte
    const cancelButton = document.createElement('button');
    cancelButton.classList.add("cropbutton");
    cancelButton.innerText = 'Cancelar';
    cancelButton.style.position = 'absolute';
    cancelButton.style.top = '20px';
    cancelButton.style.left = '20px';
    modal.appendChild(cancelButton);

    cropButton.addEventListener('click', () => {

        // Obtener los datos de la imagen recortada
        const croppedCanvas = cropper.getCroppedCanvas();

        croppedCanvas.toBlob((blob) => {
            const croppedFile = new File([blob], 'cropped-imagen.jpg', { type: 'image/jpeg' });

            // Usar DataTransfer para agregar el archivo al input file
            const dataTransfer = new DataTransfer();
            dataTransfer.items.add(croppedFile);
            selectorArchivo.files = dataTransfer.files;

            // Cerrar el modal después de recortar
            modal.remove();
            cropper.destroy();

            comprobarImagenes();
            console.log(dataTransfer.files);
        }, 'image/jpeg', 0.8);
    });

    cancelButton.addEventListener('click', () => {
        modal.remove();
        cropper.destroy();
    });
}

function comprobarImagenes() {
    const archivos = selectorArchivo.files;

    for (let i = 0; i < archivos.length; i++) {
        const archivo = archivos[i];
        const reader = new FileReader();

        reader.addEventListener('load', () => {
            const base64 = reader.result;
            images.push(base64);
            images_container.hidden = false;
            var image = document.createElement("img");
            image.src = base64;
            images_container.appendChild(image);
        });

        reader.readAsDataURL(archivo);
    }
}

function highlight() {

}

selectorArchivo.addEventListener('change', () => {
    comprobarImagenes();
});


function actualizarMathJax() {
    console.log("Jax Updated");
    MathJax.typeset();
}

function generateUUID() {
    // Crea un nuevo UUID mediante la generación de números aleatorios
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

async function obtenerUsername() {
    var xhr = new XMLHttpRequest();
    xhr.open("get", "http://127.0.0.1:7070/get_user_info");
    xhr.onload = () => {
        var res = JSON.parse(xhr.responseText);
        username = res.user.username;
    };
    xhr.send();
}
obtenerUsername();

function htmlToText(html) {
    // Crear un elemento temporal
    const tempDiv = document.createElement('div');
    // Asignar el HTML al elemento
    tempDiv.innerHTML = html;
    // Obtener el texto plano
    return tempDiv.innerText;
}

function loadChat(chat_uuid) {
    var chat_box = document.querySelector(".chat-box");
    chat_box.innerHTML = "";
    messages = [];
    for (let i = 0; i < chats.length; i++) {
        if (chats[i].uuid == chat_uuid) {
            var chat = chats[i];
            uuid = chat_uuid;
            console.log("the uuid: " + uuid);
            for (let j = 0; j < chat.msgs.length; j++) {
                var message = chat.msgs[j];
                model = message.model;
                console.log(message);
                messages.push(message);
                if (message.role == "user") {
                    if (message.content.length > 1) {
                        var message_images = [];
                        for (var k = 1; k < message.content.length; k++) {
                            message_images.push(message.content[k].image_url.url);
                        }
                        console.log(message_images);
                        appendMessage(message.content[0].text, "user-message", true, true, message_images);
                    } else {
                        appendMessage(message.content[0].text, "user-message", true, true);
                    }
                }
                if (message.role == "assistant") {
                    appendMessage(message.content, "bot-message", true, true);
                }
            }
            actualizarMathJax();
            return;
        }
    }
}

function newChat() {
    var chat_box = document.querySelector(".chat-box");
    messages = [];
    chat_box.innerHTML = "";
    uuid = generateUUID();
    images_container.innerHTML = "";
    images = [];
    images_container.hidden = true;
    selectorArchivo.files = undefined;
}

document.addEventListener('keydown', function (event) {
    // Verifica si Ctrl está presionado y si la tecla presionada es 'N'
    if (event.ctrlKey && event.key === 'N') {
        // Evita que el navegador abra una nueva ventana o pestaña
        event.preventDefault();
        newChat();
    }
    if (event.ctrlKey && event.key === 'D') {
        // Evita que el navegador abra una nueva ventana o pestaña
        event.preventDefault();
        deleteChat(uuid);
        newChat();
    }
});

async function loadChats() {
    var chat_list = document.querySelector(".chats-history");
    chat_list.innerHTML = "";
    chats = [];
    var xhr = new XMLHttpRequest();
    xhr.open("get", "http://127.0.0.1:7070/get_chat_list");
    xhr.onload = () => {
        var res = JSON.parse(xhr.responseText);

        for (let i = res.length - 1; i >= 0; i--) {
            (function (el) {
                chats.push(el);
                var chat = document.createElement("div");
                chat_list.appendChild(chat);
                chat.classList.add("chat");


                var delete_button = document.createElement("span");
                delete_button.classList.add("delete_button");
                chat.appendChild(delete_button);
                delete_button.innerText = "Borrar";
                delete_button.addEventListener("click", () => {
                    console.log("my uuid: " + uuid);
                    console.log("chat uuid: " + el.uuid);
                    if (el.uuid == uuid) {
                        newChat();
                    }
                    deleteChat(el.uuid);
                });

                var last_message = document.createElement("span");
                last_message.classList.add("last_message");
                chat.appendChild(last_message);
                if (el.msgs[el.msgs.length - 1] != undefined) {
                    last_message.innerText = htmlToText(el.msgs[el.msgs.length - 1].content);
                }
                last_message.addEventListener("click", () => {
                    loadChat(el.uuid);
                });

                var chat_uuid = document.createElement("span");
                chat_uuid.classList.add("chat-uuid");
                chat.appendChild(chat_uuid);
                chat_uuid.innerText = el.uuid;
            })(res[i]);
        }
    };
    xhr.send();
}
loadChats();

function addImage(b64) {

}



async function updateConfig() {
    await fetch('http://127.0.0.1:7070/updateConfig', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(config),
    });
    //const data = await response.json();
}

async function deleteChat(chat_uuid) {
    await fetch('http://127.0.0.1:7070/remove_chat', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ uuid: chat_uuid }),
    });
    loadChats();
    //const data = await response.json();
}

async function saveChat() {
    await fetch('http://127.0.0.1:7070/save_chat', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ uuid: uuid, chat: messages }),
    });
    loadChats();
}

function loadConfig() {
    var xhr = new XMLHttpRequest();
    xhr.open("get", "http://127.0.0.1:7070/getConfig");
    xhr.onload = () => {
        var res = JSON.parse(xhr.responseText);
        config.model = res.model;
        setModels();
    };
    xhr.send();
}
loadConfig();

// Funcion para mostrar los modelos
function setModels() {
    var selector = document.querySelector(".modelos select");
    models.forEach(function (m) {
        var opt = document.createElement('option');
        opt.value = m.model;
        opt.innerText = m.model;
        selector.add(opt);
    });
    var options = selector.querySelectorAll("option");
    options.forEach(function (opt) {
        if (opt.value == config.model) {
            opt.selected = true;
        }
    });
}


// Evento que sucede cuando se presiona la tecla Enter
messageInput.addEventListener('keydown', function (event) {
    // Send message on Enter, newline on Shift + Enter
    if (event.key === 'Enter' && !document.querySelector(".input-container button").disabled) {
        if (!event.shiftKey) {
            event.preventDefault();
            setModel();
            sendMessage();
        }
    }
});

// Funcion para seleccionar el modelo
function setModel() {
    var selector = document.querySelector(".modelos select");
    models.forEach(function (m) {
        if (selector.value == m.model) {
            model = m;
            config.model = model.model;
        }
    });
    updateConfig();
}

// Funcion de enviar un mensaje por el usuario
function sendMessage() {
    const messageText = messageInput.value.trim();
    if (messageText === '') return;

    var message_images = [];
    for (var k = 0; k < images_container.querySelectorAll("img").length; k++) {
        message_images.push(images_container.querySelectorAll("img")[k].src);
    }
    appendMessage(messageText, "user-message", true, false, message_images);

    messageInput.value = '';
    askAI(messageText);
}

function stopGeneration() {
    responding = false;
}

function escapeBackslashes(text) {
    return text.replace(/\\/g, '\\\\');
}

function unescapeHtml(escapedHtml) {
    const txt = document.createElement("textarea");
    txt.innerHTML = escapedHtml;
    return txt.value;
}

// Funcion que le pregunta a la IA
async function askAI(text) {
    responding = true;
    const button = document.querySelector(".input-container .sendButton");
    const stopButton = document.querySelector(".input-container .stopButton");
    button.disabled = true;
    button.hidden = true;
    stopButton.hidden = false;
    try {
        var msg = "";
        appendMessage("●", 'bot-message', true, false);
        var responseElement = document.querySelectorAll(".content-bot");
        responseElement = responseElement[responseElement.length - 1];

        fetch('http://127.0.0.1:7070/sendMessage', {
            method: 'POST',
            body: JSON.stringify({ messages: messages, model: model.model, source: model.source }),
            headers: { "Content-Type": "application/json" }
        })
            .then(response => {
                const reader = response.body.getReader();
                const decoder = new TextDecoder('utf-8');

                function read() {
                    return reader.read().then(({ done, value }) => {
                        if (done || !responding) {
                            stopButton.hidden = true;
                            button.disabled = false;
                            button.hidden = false;
                            responding = false;
                            var message;
                            message = {
                                "role": "assistant",
                                "model": model,
                                "real_content": responseElement.innerText,
                                "content": responseElement.innerHTML
                            };
                            messages.push(message);

                            saveChat();
                            console.log('Fin de la transmisión');
                            return;
                        }
                        const chunk = decoder.decode(value, { stream: true });

                        msg += chunk;

                        var converter = new showdown.Converter();
                        if ((msg.split("```").length - 1) % 2 == 0) {
                            var html = converter.makeHtml(escapeBackslashes(msg) + "");
                        } else {
                            var html = converter.makeHtml(escapeBackslashes(msg) + "\n```");
                        }

                        responseElement.innerHTML = html; // Agregar contenido a la respuesta

                        var as = responseElement.querySelectorAll("a");
                        as.forEach(function (a) {
                            a.target = "_blank";
                        });
                        actualizarMathJax();
                        var codes = responseElement.querySelectorAll("code");
                        for (var i = 0; i < codes.length; i++) {
                            if (responseElement.querySelectorAll("code")[i] == undefined) {
                                continue;
                            }
                            if (Prism.languages[codes[i].classList[0]] == undefined) {
                                responseElement.querySelectorAll("code")[i].innerHTML = Prism.highlight(unescapeHtml(codes[i].innerHTML), Prism.languages.javascript, "javascript");
                            } else {
                                responseElement.querySelectorAll("code")[i].innerHTML = Prism.highlight(unescapeHtml(codes[i].innerHTML), Prism.languages[codes[i].classList[0]], codes[i].classList[0]);
                            }
                        }
                        return read();
                    });
                }
                read();
            })
            .catch(error => {
                console.error('Error:', error);
                appendMessage(error, 'bot-message', false, false);
                stopButton.hidden = true;
                button.disabled = false;
                button.hidden = false;
                responding = false;
            });

    } catch (error) {
        appendMessage(error, 'bot-message', false, false);
        console.error('Error:', error);
        stopButton.hidden = true;
        button.disabled = false;
        button.hidden = false;
        responding = false;
    }
}

// Funcion de agregar el mesaje al chat
function appendMessage(text, messageType = "", can_add, html, message_images = []) {
    const messageElement = document.createElement('div');
    const sender = document.createElement('div');
    const content = document.createElement('div');

    var role = "";
    var classname = "";
    var content_classname = "";
    var mstype = messageType;
    model;

    if (mstype == "user-message") {
        mstype = username;
        role = "user";
        classname = "sender-user";
        content_classname = "content-user";
        var message;
        if (images.length > 0) {
            var contenido = [];
            contenido.push(
                {
                    type: "text",
                    text: text,
                }
            );
            for (var i = 0; i < images.length; i++) {
                contenido.push(
                    {
                        type: "image_url",
                        image_url: {
                            url: images[i]
                        }
                    }
                );
            }
            message = {
                "role": role,
                "model": model,
                "real_content": contenido,
                "content": contenido
            };
            console.log(images);
            images_container.innerHTML = "";
            images = [];
            images_container.hidden = true;
            selectorArchivo.files = undefined;
        } else {
            message = {
                "role": role,
                "model": model,
                "real_content": [{
                    type: "text",
                    text: text,
                }],
                "content": [{
                    type: "text",
                    text: text,
                }]
            };
        }
        if (can_add) {
            messages.push(message);
        }
    }
    if (mstype == "bot-message") {
        mstype = model.model;
        role = "assistant";
        classname = "sender-bot";
        content_classname = "content-bot";

        var profile_image = document.createElement("img");
        profile_image.classList.add("profile_img");
        sender.appendChild(profile_image);
        if (model.source == "openai") {
            profile_image.src = "imgs/logos/openai.svg";
        }
        if (model.source == "groq") {
            profile_image.src = "imgs/logos/meta-color.svg";
        }
        if (model.source == "google") {
            profile_image.src = "imgs/logos/gemini.png";
        }
    }

    var sender_name = document.createElement("span");
    sender_name.innerText = mstype + ":";
    sender.appendChild(sender_name);
    sender.classList.add(classname);
    messageElement.appendChild(sender);

    if (message_images.length > 0) {
        const image_container = document.createElement('div');
        image_container.classList.add("message_images");
        messageElement.appendChild(image_container);
        for (var i = 0; i < message_images.length; i++) {
            var message_image = document.createElement('img');
            message_image.src = message_images[i];
            image_container.appendChild(message_image);
        }
    }

    if (html) {
        content.innerHTML = text;
        var as = content.querySelectorAll("a");
        as.forEach(function (a) {
            a.target = "_blank";
        });
    } else {
        content.innerText = text;
    }

    content.classList.add(content_classname);
    messageElement.classList.add('message', messageType);
    messageElement.appendChild(content);
    chatBox.appendChild(messageElement);

    const options = document.createElement('div');
    const option_copy = document.createElement('span');
    options.classList.add("options");
    messageElement.appendChild(options);
    options.appendChild(option_copy);
    option_copy.innerText = "Copy";
    option_copy.classList.add("option-el");
    option_copy.addEventListener('click', function () {
        var cont = content.innerText;
        navigator.clipboard.writeText(cont).then(() => {
            option_copy.innerText = "Copied";
            setTimeout(() => {
                option_copy.innerText = "Copy";
            }, 5000);
        });
    });

    // Scroll to the bottom of the chat box
    chatBox.scrollTop = chatBox.scrollHeight;
}