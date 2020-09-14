build: build_frontend
	docker build -t minecraft-manager .

build_frontend: frontend_build_image
	docker run -v ${PWD}/frontend:/app -w /app minecraft-manager-build yarn build
	rsync -av frontend/build/* static/
	rsync -av static/static/* static/

frontend_build_image:
	cd frontend && docker build -t minecraft-manager-build .

run: build
	docker run -ti --rm -v ${PWD}:/app -e MINECRAFT_ROOT -v $MINECRAFT_ROOT:MINECRAFT_ROOT --net=host -w /app --privileged --pid=host minecraft-manager
