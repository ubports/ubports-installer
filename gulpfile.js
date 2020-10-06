const gulp = require("gulp");
const pug = require("gulp-pug");
gulp.task("pug", function() {
  return gulp
    .src("src/pug/index.pug")
    .pipe(
      pug({
        data: {
          installerVersion: require("./package.json").version
        },
        compileDebug: true,
        pretty: true
      })
    )
    .pipe(gulp.dest("src/html"));
});
