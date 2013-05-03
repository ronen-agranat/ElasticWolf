NAME=ElasticWolf
VER=$(shell awk -F= '{if($$1=="Version"){gsub(/[\"\",;]+/,"",$$2);print $$2;}}' $(NAME)/application.ini)
OSX=$(NAME).app/Contents

# Build artefacts go here
build_dir := build

# Stand-alone XULRunner builds for various platforms
zip_file_osx := $(build_dir)/$(NAME)-osx-$(VER).zip
zip_file_win := $(build_dir)/$(NAME)-win-$(VER).zip
zip_file_linux := $(build_dir)/$(NAME)-linux-$(VER).zip

# Firefox extension
xpi_file=$(NAME)-$(VER).xpi

# Files to omit from XPI
files_to_exclude_from_xpi := '*/xulrunner/**' \
	'*/xulrunner/' \
	'**.DS_Store' \
	'*.exe' \
	'*.dll' \
	'*/ElasticWolf' \
	'*/logo*' \
	'*/application.ini' \
	'*/bin/' \
	'*/bin/**' \
	'*/etc/' \
	'*/etc/**' \
	'**/prefs.js'

# Path to installed Firefox extension
profile_xpi_file := $(ELASTICWOLF_FIREFOX_PROFILE_DIR)/extensions/{2564a6b0-73ab-11e0-a1f0-0800200c9a66}.xpi

all:

run: dev
	$(OSX)/MacOS/xulrunner -jsconsole

dev: clean_osx
	ln -sf `pwd`/$(NAME)/chrome $(OSX)/Resources/chrome 
	ln -sf `pwd`/$(NAME)/defaults $(OSX)/Resources/defaults 
	ln -sf `pwd`/$(NAME)/application.ini $(OSX)/Resources/application.ini
	ln -sf `pwd`/$(NAME)/chrome.manifest $(OSX)/Resources/chrome.manifest

build: clean build_osx build_win build_linux xpi md5 xpi
	make dev

md5:
	for f in $(build_dir)/{*.zip,*.xpi} ; do md5 -r $$f > $$f.md5 ; done

prepare: clean prepare_osx

prepare_osx: clean_osx
	cp -a $(NAME)/application.ini $(NAME)/chrome $(NAME)/chrome.manifest $(NAME)/defaults $(OSX)/Resources

build_osx: prepare_osx
	zip -rqy $(zip_file_osx) $(NAME).app -x '**/.DS_Store' '**/prefs-firefox.js'

build_win:
	zip -rq $(zip_file_win) $(NAME) -x '**/.DS_Store' '**/prefs-firefox.js'

build_linux:
	zip -rq $(zip_file_linux) $(NAME) -x '*/xulrunner/**' '*.exe' '*.dll' '**/.DS_Store' '**/prefs-firefox.js'
	
xpi:
	cd ElasticWolf && zip -rq ../$(build_dir)/$(xpi_file) . -x $(files_to_exclude_from_xpi)

# Install Firefox extension by copying XPI file to Firefox profile
install: xpi
	@[ -z "$(ELASTICWOLF_FIREFOX_PROFILE_DIR)" ]  && \
		echo "Please set the ELASTICWOLF_FIREFOX_PROFILE_DIR environment variable as per README.md"  || \
		(cp $(build_dir)/$(xpi_file) $(profile_xpi_file) && \
			echo "Installed XPI file to $(profile_xpi_file)")

clean: clean_osx
	rm -rf *.zip *.xpi ../$(NAME)-*.zip ../$(NAME)-*.xpi -x '**.DS_Store'
	rm -rf $(build_dir)
	mkdir -p $(build_dir)

clean_osx:
	rm -rf $(OSX)/Resources/chrome $(OSX)/Resources/application.ini $(OSX)/Resources/defaults $(OSX)/Resources/chrome.manifest

put: build
	./s3upload www.elasticwolf.com/Releases/ElasticWolf-osx-$(VER).zip $(build_dir)/ElasticWolf-osx-$(VER).zip
	./s3upload www.elasticwolf.com/Releases/ElasticWolf-osx-$(VER).zip.md5 $(build_dir)/ElasticWolf-osx-$(VER).zip.md5
	./s3upload www.elasticwolf.com/Releases/ElasticWolf-win-$(VER).zip $(build_dir)/ElasticWolf-win-$(VER).zip
	./s3upload www.elasticwolf.com/Releases/ElasticWolf-win-$(VER).zip.md5 $(build_dir)/ElasticWolf-win-$(VER).zip.md5
	./s3upload www.elasticwolf.com/Releases/ElasticWolf-linux-$(VER).zip $(build_dir)/ElasticWolf-linux-$(VER).zip
	./s3upload www.elasticwolf.com/Releases/ElasticWolf-linux-$(VER).zip.md5 $(build_dir)/ElasticWolf-linux-$(VER).zip.md5
	./s3upload www.elasticwolf.com/Releases/ElasticWolf-$(VER).xpi $(build_dir)/ElasticWolf-$(VER).xpi
	./s3upload www.elasticwolf.com/Releases/ElasticWolf-$(VER).xpi.md5 $(build_dir)/ElasticWolf-$(VER).xpi.md5
	./s3upload www.elasticwolf.com/index.html $(VER)

.PHONY: clean_osx dev
