import sys
sys.path.insert(0, '/home/hatch/workspace/tandem')
import importlib.util
spec = importlib.util.spec_from_file_location('emit_obs', '/home/hatch/workspace/tandem/emit-observation.py')
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)
which = sys.argv[1]
obs = open('/tmp/obs%s.txt' % which).read().strip()
try:
    m.main(['learn-round116', obs])
except SystemExit as e:
    print('exit', e.code)
