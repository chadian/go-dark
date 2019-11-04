"use strict";
const dnd = require('@sindresorhus/do-not-disturb');
const { app, Menu, Tray } = require('electron');
let tray = null;
app.on('ready', () => {
    tray = new Tray('/path/to/my/icon');
    const contextMenu = Menu.buildFromTemplate([
        { label: 'Item1', type: 'radio' },
        { label: 'Item2', type: 'radio' },
        { label: 'Item3', type: 'radio', checked: true },
        { label: 'Item4', type: 'radio' }
    ]);
    tray.setToolTip('This is my application.');
    tray.setContextMenu(contextMenu);
});
