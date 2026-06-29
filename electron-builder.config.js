/** @type {import('electron-builder').Configuration} */
module.exports = {
  appId: 'com.ultimaitrex.gantt-chart',
  productName: 'Gantt Chart',
  directories: {
    buildResources: 'build',
    output: 'dist'
  },
  files: [
    'out/**/*'
  ],
  extraResources: [],
  win: {
    target: [
      {
        target: 'portable',
        arch: ['x64']
      }
    ]
  },
  nsis: {
    oneClick: false,
    allowToChangeInstallationDirectory: true
  }
}
