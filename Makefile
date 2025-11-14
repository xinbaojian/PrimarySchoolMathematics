build:
	yarn build

deploy: build
	cd dist && scp * -r root@8.140.17.32:/usr/share/nginx/math