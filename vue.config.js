const { defineConfig } = require('@vue/cli-service')

module.exports = defineConfig({
  transpileDependencies: true,
  configureWebpack: {
    devtool: 'source-map',
    resolve: {
      fallback: {
        "path": require.resolve("path-browserify"),
        "fs": false
      }
    }
  },
  pluginOptions: {
    electronBuilder: {
      nodeIntegration: true,
      mainProcessFile: 'src/background.ts',
      builderOptions: {
        appId: "com.xiaolei.app",
        productName: "小蕾",
        directories: {
          output: "dist_electron"
        },
        win: {
          target: [
            {
              target: "nsis",
              arch: [
                "x64"
              ]
            }
          ]
        },
        nsis: {
          oneClick: true,
          perMachine: false,
          allowToChangeInstallationDirectory: false,
          createDesktopShortcut: true,
          createStartMenuShortcut: true,
          shortcutName: "小蕾"
        },
        files: [
          "**/*"
        ],
        extraResources: [
          {
            from: "image",
            to: "image",
            filter: ["**/*"]
          },
          {
            from: "public/image",
            to: "public/image",
            filter: ["**/*"]
          },
          {
            from: "public/image/small-window",
            to: "public/image/small-window",
            filter: ["**/*"]
          }
        ]
      }
    }
  }
}) 