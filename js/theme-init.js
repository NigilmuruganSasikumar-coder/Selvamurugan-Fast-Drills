/* Runs in <head> BEFORE first paint so the saved/system theme is applied with no flash.
   Keep this as a normal (non-defer) script. */
(function () {
        var stored = localStorage.getItem("smfd-theme");
        var prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
        document.documentElement.setAttribute("data-theme", stored || (prefersDark ? "dark" : "light"));
    })();
