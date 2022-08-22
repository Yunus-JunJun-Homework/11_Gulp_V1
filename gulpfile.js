'use strict';

const project_folder = 'dist';
const source_folder = 'src';

const path = {
  build: {
    html: project_folder + '/',
    css: project_folder + '/css/',
    js: project_folder + '/js/',
    img: project_folder + '/img/',
    fonts: project_folder + '/fonts/',
  },
  src: {
    html: [source_folder + '/*.html', '!' + source_folder + '/_*.html'],
    css: source_folder + '/scss/style.scss',
    js: source_folder + '/js/script.js',
    img: source_folder + '/img/**/*.{jpg, png, svg, gif, ico, webp}',
    fonts: source_folder + '/fonts/**/*.ttf',
  },
  watch: {
    html: source_folder + '/**/*.html',
    css: source_folder + '/scss/**/*.scss',
    js: source_folder + '/js/**/*.js',
    img: source_folder + '/img/**/*.{jpg, png, svg, gif, ico, webp}',
  },
  clean: './' + project_folder + '/'
}

const {src, dest, series, parallel} = require('gulp');
const gulp = require('gulp');
const browser_Sync = require('browser-sync').create();
const fileInclude = require('gulp-file-include');
const fsExtra = (require('fs-extra'));
const fs = require('fs');
const scss = require('gulp-sass')(require('sass'));
const autoprefixer = require('gulp-autoprefixer');
const group_media = require('gulp-group-css-media-queries');
const clean_css = require('gulp-clean-css');
const rename = require('gulp-rename');
const uglify = require('gulp-uglify-es').default;
const imagemin = require('gulp-imagemin');
const webp = require('gulp-webp');
const webpHtml = require('gulp-webp-html');
const webpCss = require('gulp-webpcss');
const svgSprite = require('gulp-svg-sprite');
const ttf2woff = require('gulp-ttf2woff');
const ttf2woff2 = require('gulp-ttf2woff2');


const browserSync = () => {
  browser_Sync.init({
    server: {
      baseDir: './' + project_folder + '/',
    },
    port: 3000,
    notify: false,
  })
};

const clean = async () => {
  try {
    await fsExtra.remove('dist')
    console.log('success!')
  } catch (err) {
    console.error(err)
  }
};

const html = () => src(path.src.html)
  .pipe(fileInclude())
  .pipe(webpHtml())
  .pipe(dest(path.build.html))
  .pipe(browser_Sync.stream());

const css = () => {
  return src(path.src.css)
    .pipe(
      scss.sync({
        outputStyle: 'expanded'
      }).on('error', scss.logError)
    )
    .pipe(
      group_media()
    )
    .pipe(
      autoprefixer(
        {
          overrideBrowserslist: ['last 5 versions'],
          cascade: true,
        })
    )
    .pipe(webpCss())
    .pipe(dest(path.build.css))
    .pipe(clean_css())
    .pipe(rename({
      extname: '.min.css'
    }))
    .pipe(dest(path.build.css))
    .pipe(browser_Sync.stream());
}

const js = () => {
  return src(path.src.js)
    .pipe(fileInclude())
    .pipe(dest(path.build.js))
    .pipe(
      uglify()
    )
    .pipe(rename({
      extname: '.min.js'
    }))
    .pipe(dest(path.build.js))
    .pipe(browser_Sync.stream());
}
const images = () => {
  return src(path.src.img)
    .pipe(webp({
      quality: 75
    }))
    .pipe(dest(path.build.img))
    .pipe(src(path.src.img))
    .pipe(imagemin([
      imagemin.gifsicle({interlaced: true}),
      imagemin.mozjpeg({quality: 75, progressive: true}),
      imagemin.optipng({optimizationLevel: 5}), // 0 to 7
      imagemin.svgo({
        plugins: [
          {removeViewBox: false},
        ]
      })
    ]))
    .pipe(dest(path.build.img))
    .pipe(browser_Sync.stream());
}

const fonts = () => {
  src(path.src.fonts)
    .pipe(ttf2woff())
    .pipe(dest(path.build.fonts));
  return src(path.src.fonts)
    .pipe(ttf2woff2())
    .pipe(dest(path.build.fonts));
};



// отдельная функция (задача) соберает все иконки svg в один файл
// после выполнения команды в dist > img > icons так же внутри папки
// icons > stack есть файл с примерами подключения sprite.stack.html
gulp.task('svgSprite', function (){
  return gulp.src ([source_folder + '/iconsprite/*.svg'])
    .pipe(svgSprite({
      mode: {
        stack:{
          sprite: '../icons/in.svg', //sprite file name
            example: true
        }
      },
    }))
    .pipe(dest(path.build.img))
})

//подкючает автоматом все шрифты
const fontsStyle = () => {
  let file_content = fs.readFileSync(source_folder + '/scss/fonts.scss');
  if (file_content === '') {
    fs.writeFile(source_folder + '/scss/fonts.scss', '', cb);
    return fs.readdir(path.build.fonts, function (err, items) {
      if (items) {
        let c_fontname;
        for (let i = 0; i < items.length; i++) {
          let fontName = items[i].split('.');
          fontName = fontName[0];
          if (c_fontname !== fontName) {
            fs.appendFile(source_folder + '/scss/fonts.scss', '@include font("' + fontName + '", "' + fontName + '", "400", "normal");\r\n', cb);
          }
          c_fontname = fontName;
        }
      }
    })
  }
};
const cb = () => {};

const watchFiles = () => {
  gulp.watch([path.watch.html], html)
  gulp.watch([path.watch.css], css)
  gulp.watch([path.watch.js], js)
  gulp.watch([path.watch.img], images)
};

const build = series(clean, parallel(js, css, html, images, fonts), fontsStyle);
const watch = parallel(build, watchFiles, browserSync);


exports.fontsStyle = fontsStyle;
exports.fonts = fonts;
exports.images = images;
exports.js = js;
exports.css = css;
exports.html = html;
exports.clean = clean;
exports.build = build;
exports.watch = watch;
exports.default = watch;