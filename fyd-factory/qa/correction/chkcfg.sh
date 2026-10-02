grep -n "transform" -A 4 /home/nolan/qa-correction/jest.config.cjs
node -e "const c=require('/home/nolan/qa-correction/jest.config.cjs'); console.log(JSON.stringify(c.transform));"
