cd /home/nolan/projects/ping
python3 -c "import json; print(json.load(open('package.json'))['scripts'])"
ps -o pid,ppid,tty,etime,cmd -p 2416
