const config = {
  mode: 'development', // 'production'
  themePath: './site/plugins/kirby3-tp-theme-leap',
  themeName: 'theme',
  assetsPath: './assets',
  buildPath: './build',
}

const isDev = 'development' == config.mode

const gulp = require('gulp'),
      mergeJson = require('gulp-merge-json'),
      webpack = require('webpack-stream'),
      FixStyleOnlyEntriesPlugin = require('webpack-fix-style-only-entries'),
      ManifestPlugin = require('webpack-manifest-plugin'),
      MiniCssExtractPlugin = require('mini-css-extract-plugin'),
      OptimizeCSSAssetsPlugin = require('optimize-css-assets-webpack-plugin'),
      TerserPlugin = require('terser-webpack-plugin'),
      cssImporter = require('node-sass-css-importer')({
        import_paths: [config.themePath + '/scss']
      })

gulp.task('app:css', () => {
  return gulp
    // handel by entry
    .src('.*', { read: false })
    .pipe(webpack({
      mode: config.mode,
      entry: {
        'bootstrap': config.themePath + '/scss/' + config.themeName + '.scss',
        'app': config.assetsPath  + '/scss/app.scss',
      },
      plugins: [
        new ManifestPlugin(),
        new FixStyleOnlyEntriesPlugin({
          silent: true,
        }),
        new MiniCssExtractPlugin({
          filename: isDev ? '[name].css' : '[name].[contenthash].css',
        }),
      ],
      module: {
        rules: [
          {
            test: /\.s[ac]ss$/i,
            use: [
              MiniCssExtractPlugin.loader,
              'css-loader',
              {
                loader: 'postcss-loader',
                options: { options: {} }
              },
              {
                // fonts/Inter-UI-upright.var.woff2
                loader: 'sass-loader',
                options: {
                  sassOptions: {
                    importer: cssImporter
                  }
                }
              },
              {
                loader: 'string-replace-loader',
                options: {
                  search: 'user-variables',
                  replace: './assets/scss/variables',
                }
              },
            ]
          }
        ]
      },
      optimization: {
        minimize: !isDev,
        minimizer: [
          new OptimizeCSSAssetsPlugin({
            cssProcessorPluginOptions: {
              preset: ['default', { discardComments: { removeAll: true } }],
            },
          })
        ],
      },
    }))
    .pipe(gulp.dest(config.buildPath + '/css'))
})

gulp.task('app:js', () => {
  return gulp
    // handel by entry
    .src('.*', { read: false })
    .pipe(webpack({
      mode: config.mode,
      entry: {
        'bootstrap': config.themePath  + '/js/bootstrap/index.js',
        'mrare': config.themePath  + '/js/mrare/index.js',
        'app': config.assetsPath  + '/js/app.js',
      },
      resolve: {
        alias: {
          jquery: require.resolve('jquery'),
        }
      },
      plugins: [
        new ManifestPlugin(),
        new webpack.webpack.ProvidePlugin({
          $: 'jquery',
          jQuery: 'jquery',
        }),
      ],
      optimization: {
        minimize: !isDev,
        minimizer: [
          new TerserPlugin({
            extractComments: false,
          }),
        ],
      },
      output: {
        filename: isDev ? '[name].js' : '[name].[contenthash].js',
      },
    }))
    .pipe(gulp.dest(config.buildPath + '/js'))
})

gulp.task('manifest:merge', () => {
  return gulp
    .src([
      config.buildPath + '/css/manifest.json',
      config.buildPath + '/js/manifest.json',
    ], { allowEmpty: true })
    .pipe(mergeJson({
      fileName: 'manifest.json',
    }))
    .pipe(gulp.dest('./'))
})

gulp.task('watch',() => {
  gulp.watch(config.assetsPath + '/scss/*.scss', gulp.series('app:css', 'manifest:merge'))
  gulp.watch(config.assetsPath + '/js/*.js', gulp.series('app:js', 'manifest:merge'))
})

gulp.task('go:dev', gulp.parallel('watch'))
gulp.task('go:prod',  gulp.series('app:css', 'app:js', 'manifest:merge'))
