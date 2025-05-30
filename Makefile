dev:
	npm run dev

build:
	npm run build

deploy:
	npx convex deploy --cmd 'npm run build'
	for ext in js css; do \
		cp dist/assets/index-*.$$ext ~/src/optimizationprocess.com/assets/probable-panic/main.$$ext; \
	done
