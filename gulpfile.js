// 实现这个项目的构建任务
const { src, dest, parallel, series, watch } = require('gulp')

const del = require('del')

const loadPlugins = require('gulp-load-plugins')
const plugins = loadPlugins()

const browserSync = require('browser-sync')
const bs = browserSync.create()
const cwd = process.cwd()

const exec = require('child_process').exec
const argv = require('minimist')(process.argv.slice(2))
let config = {
  // default config
  build: {
    src: 'src',
    dist: 'dist',
    temp: 'temp',
    public: 'public',
    paths: {
      styles: 'assets/styles/*.scss',
      scripts: 'assets/scripts/*.js',
      pages: '*.html',
      images: 'assets/images/**',
      fonts: 'assets/fonts/**'
    }
  }
}

try {
  const loadConfig = require(`${cwd}/pages.config.js`)
  config = Object.assign({}, config, loadConfig)
} catch (error) {}

// const useref = require('gulp-useref')

// const plugins.sass = require('gulp-sass')
// const plugins.babel = require('gulp-babel')
// const plugins.swig = require('gulp-swig')
// const plugins.imagemin = require('gulp-imagemin')

const clean = () => {
  return del([config.build.dist, config.build.temp])
}

const style = () => {
  return src(config.build.paths.styles, { base: config.build.src, cwd: config.build.src })
        .pipe(plugins.sass({ outputStyle: 'expanded' }))
        .pipe(dest(config.build.temp))
        .pipe(bs.reload({ stream: true }))// 监听并自动更新
}

const script = () => {
  return src(config.build.paths.scripts, { base: config.build.src, cwd: config.build.src })
        .pipe(plugins.babel({ presets: [require('@babel/preset-env')] }))
        .pipe(dest(config.build.temp))
}

const page = () => {
  return src(config.build.paths.pages, { base: config.build.src, cwd: config.build.src })
        .pipe(plugins.swig({data: config.data}))
        .pipe(dest(config.build.temp))
}

const image = () => {
  return src(config.build.paths.images, { base: config.build.src, cwd: config.build.src })
        .pipe(plugins.imagemin())
        .pipe(dest(config.build.dist))
}

const font = () => {
  return src(config.build.paths.fonts, { base: config.build.src, cwd: config.build.src })
        .pipe(plugins.imagemin())
        .pipe(dest(config.build.dist))
}

const extra = () => {
  return src('**', { base: config.build.public, cwd: config.build.public })
        .pipe(dest(config.build.dist))
}

const serve = () => {
  watch(config.build.paths.styles, { cwd: config.build.src }, style)
  watch(config.build.paths.scripts, { cwd: config.build.src }, script)
  watch(config.build.paths.pages, { cwd: config.build.src }, page)
  // watch('src/assets/images/**', image)
  // watch('src/assets/fonts/**', font)
  // watch('public/**', extra)
  watch([
    config.build.paths.images, 
    config.build.paths.fonts
  ], { cwd: config.build.src }, bs.reload)

  watch('**', { cwd: config.build.public }, bs.reload)

  bs.init({
    notify: false,
    port: 2080,
    open: true,
    files: 'temp/**',
    server: {
      baseDir: [config.build.temp, config.build.src, config.build.public],
      routes: {
        '/node_modules': 'node_modules'
      }
    }
  })
}

const useref = () => {
  return src(config.build.paths.pages, { base: config.build.temp, cwd: config.build.temp })
        .pipe(plugins.useref({ searchPath: [config.build.temp, '.'] }))
        // html js css
        .pipe(plugins.if(/\.js$/, plugins.uglify()))
        .pipe(plugins.if(/\.css$/, plugins.cleanCss()))
        .pipe(plugins.if(/\.html$/, plugins.htmlmin({ 
          collapseWhitespace: true, 
          minifyCSS: true,
          minifyJS: true
        })))
        .pipe(dest(config.build.dist))
}

// git add
const add = done => {
  exec('git add .', (err, stdot, stderr) => {
    done(err)
  })
}
// git commit
const commit = done => {
  let commitMsg = 'fix bugs'
  // 提交信息
  if(argv.m) {
    commitMsg = argv.m
  }
  exec(`git commit -m "${commitMsg}"`, (err, stdot, stderr) => {
    done(err)
  })
}
// git pull
const pull = done => {
  exec('git pull', (err, stdot, stderr) => {
    done(err)
  })
}
// git push
const push = done => {
  exec('git push', (err, stdot, stderr) => {
    done(err)
  })
}


const compile = parallel(style, script, page)

// 上线前执行的任务
const build = series(clean, parallel(series(compile, useref), extra, image, font)) 
// 开发执行任务
const start = series(compile, serve)
// 部署到git仓库
const deploy = series(add, commit, pull, push)

module.exports = {
  clean,
  build,
  start,
  serve,
  deploy
}
