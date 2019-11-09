import { app, Menu, Tray } from 'electron';
const dnd = require('@sindresorhus/do-not-disturb');

app.on('ready', async () => {
  // remove dock icon
  app.dock.hide()

  const tray = new Tray('./assets/images/pixel.png')

  const settings = new Settings();
  const manager = new DNDManger();

  manager.addOnChangeHandler(
    () => constructTray(tray, manager, settings)
  );

  constructTray(tray, manager, settings);

  setInterval(() => {
    tray.setTitle(emojiIcon(manager));
  }, 1000);
});

function constructTray(tray: Tray, dndManager: DNDManger, settings: Settings) {
  tray.setContextMenu(buildMenuBarMenu(dndManager, settings));
  tray.setTitle(emojiIcon(dndManager));
}

function emojiIcon(manager: DNDManger) {
  if (!manager.dndEnabled) {
    return '🌕';
  }

  if (manager.endTime === Infinity) {
    return '🌑';
  }

  if (!manager.endTime || !manager.startTime) {
    return '🌑';
  }

  const totalDuration = manager.endTime - manager.startTime;
  const percentage = 100 * ((Date.now() - manager.startTime) / totalDuration);

  if (percentage < 25 ) {
    return '🌑';
  } else if (percentage < 50) {
    return '🌘';
  } else if (percentage < 75) {
    return '🌗';
  } else if (percentage < 100) {
    return '🌖';
  } else {
    return '🌑';
  }
}

function buildMenuBarMenu(manager: DNDManger, settings: Settings) {
  const menu = Menu.buildFromTemplate([
    {
      id: 'notifications-enabled-label',
      label: (manager.dndEnabled ? 'In the dark' : 'In the light'),
      enabled: false
    },
    { type: 'separator' },
    {
      id: 'enable-notifications',
      label: 'Activate notifications',
      visible: manager.dndEnabled,
      click() {
        return manager.disable();
      }
    },
    {
      label: 'Go dark for',
      submenu: settings.durationOptions.map(
        (duration: Duration) => ({
          ...duration,
          option: 'radio',
          checked: duration.id === (settings.selectedDuration && settings.selectedDuration.id) ? true : false,

          click() {
            settings.selectedDuration = duration;
            manager.disable();
            manager.enable(duration.amount);
          }
        })
      )
    },
    { type: 'separator' },
    {
      label: 'Quit',
      type: 'normal',
      click: () => app.quit()
    }
  ])

  return menu;
}

type Duration = {
  id: string,
  label: string
  amount: number
}

class Settings {
  selectedDuration: Duration | null = null;

  durationOptions: Duration[] = [
    { id: 'forever', label: 'Forever', amount: Infinity },
    { id: '5-min', label: '5 minutes', amount: 5 * 60 * 1000 },
    { id: '10-min', label: '10 minutes', amount: 10 * 60 * 1000 },
    { id: '15-min', label: '15 minutes', amount: 15 * 60 * 1000 },
    { id: '30-min', label: '30 minutes', amount: 30 * 60 * 1000 },
    { id: '1-hour', label: '1 hour', amount: 60 * 60 * 1000 },
    { id: '2-hour', label: '2 hour', amount: 2 * 60 * 60 * 1000 },
    { id: '4-hour', label: '4 hour', amount: 4 * 60 * 60 * 1000 },
  ]
}

class DNDManger {
  dndEnabled: boolean = false;

  /**
   * @property timerId
   * @description The timer ID returned from `setInterval`.
   */
  timerId: NodeJS.Timeout | null = null;

  /**
   * @property startTime
   * @description Represents the start time in milliseconds since the unix epoch,
   * or null if not currently set.
   */
  startTime : number | null = null;
  endTime: number | null = null;
  onChangeHandlers: (() => any)[] = []

  constructor() {
    dnd.on('change', () => this.sync());
    this.sync();
  }

  async disable() {
    await dnd.disable();
  }

  static readonly TIMER_CHECK_FREQUENCY_IN_MILLISECONDS = 1000

  /**
   * Enable notifications for `enabledFor` amount of milliseconds
   * @param enabledFor The number of milliseconds to enable notifications for
   */
  async enable(enabledFor: number) {
    // clear existing timer if one exists
    this.clearTimer();

    this.timerId = setInterval(
      () => this.checkTimer(),
      DNDManger.TIMER_CHECK_FREQUENCY_IN_MILLISECONDS
    );

    this.startTime = Date.now();
    this.endTime = this.startTime + enabledFor;

    await dnd.enable();
  }

  checkTimer() {
    if (this.endTime && Date.now() >= this.endTime) {
      this.disable();
    }

    this.sync();
  }

  clearTimer() {
    if (this.timerId) {
      clearInterval(this.timerId);
    }

    this.timerId = null;
    this.startTime = null;
  }

  addOnChangeHandler(handler: () => any) {
    this.onChangeHandlers.push(handler);
  }

  async sync() {
    const dndIsEnabled = await dnd.isEnabled();

    if (this.dndEnabled === dndIsEnabled) {
      return
    }

    this.dndEnabled = dndIsEnabled;

    if (!this.dndEnabled) {
      this.clearTimer();
    }

    this.onChangeHandlers.forEach(handler => handler());
  }
}