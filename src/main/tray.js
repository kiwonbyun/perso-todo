const { Tray, Menu, nativeImage } = require('electron')
const path = require('path')

function createTray(win) {
  const iconPath = path.join(__dirname, '../../assets/tray-icon.png')
  let icon
  try {
    icon = nativeImage.createFromPath(iconPath)
  } catch {
    icon = nativeImage.createEmpty()
  }

  const tray = new Tray(icon)
  tray.setToolTip('perso-todo')

  const contextMenu = Menu.buildFromTemplate([
    {
      label: '열기',
      click: () => {
        win.show()
        win.focus()
      }
    },
    { type: 'separator' },
    {
      label: '종료',
      click: () => {
        tray.destroy()
        require('electron').app.quit()
      }
    }
  ])

  tray.setContextMenu(contextMenu)

  tray.on('double-click', () => {
    win.show()
    win.focus()
  })

  return tray
}

module.exports = { createTray }
