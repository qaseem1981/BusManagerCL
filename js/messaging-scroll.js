window.messagingScroll = window.messagingScroll || {};

window.messagingScroll.toMessage = function (elementId) {
    window.requestAnimationFrame(function () {
        var element = document.getElementById(elementId);
        if (!element) {
            return;
        }

        var container = document.getElementById("manager-message-list") || element.closest(".message-feed");
        if (container) {
            var elementBottom = element.offsetTop + element.offsetHeight;
            var targetTop = Math.max(0, elementBottom - container.clientHeight + 12);
            container.scrollTo({ top: targetTop, behavior: "smooth" });
            return;
        }

        element.scrollIntoView({ block: "nearest", behavior: "smooth" });
    });
};

window.messagingScroll.isNearBottom = function (containerId) {
    var container = document.getElementById(containerId);
    if (!container) {
        return true;
    }

    return container.scrollHeight - container.scrollTop - container.clientHeight < 80;
};
