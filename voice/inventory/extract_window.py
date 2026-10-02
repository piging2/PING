import struct, os, sys
HOME = os.path.expanduser('~')
INV = os.path.join(HOME, 'workspace/voice/inventory')
TAIL = os.path.join(INV, sys.argv[3]) if len(sys.argv) > 3 else os.path.join(INV, 'recon_tail.bin')
TAIL_ABS = int(sys.argv[4]) if len(sys.argv) > 4 else 529473221
MOOV_REL = 30000000
T_SEC = float(sys.argv[1]) if len(sys.argv) > 1 else 720.0
N_SEC = float(sys.argv[2]) if len(sys.argv) > 2 else 60.0
OUT = os.path.join(INV, 'recon_sample_t%d.aac' % int(T_SEC))
MOOV_SRC = os.path.join(INV, 'recon_tail.bin')
f = open(MOOV_SRC,'rb'); f.seek(MOOV_REL); buf = f.read(4186250); f.close()

def box_at(off):
    blen = struct.unpack('>I', buf[off:off+4])[0]
    btype = buf[off+4:off+8]
    hlen = 16 if blen == 1 else 8
    if blen == 1: blen = struct.unpack('>Q', buf[off+8:off+16])[0]
    return btype, off, off+hlen, off+blen

def kids(off, end):
    out = []; p = off
    while p + 8 <= end:
        t, o, c, e = box_at(p)
        if e > end or e <= p: break
        out.append((t,o,c,e)); p = e
    return out

def find_all(off, end, ttype, containers):
    res = []
    for (t,o,c,e) in kids(off,end):
        if t == ttype: res.append((o,c,e))
        if t in containers: res += find_all(c, e, ttype, containers)
    return res

CONT = {b'moov',b'trak',b'edts',b'mdia',b'minf',b'dinf',b'stbl'}
moov = box_at(0)
# total duration from mvhd
mvhd = find_all(moov[2], moov[3], b'mvhd', CONT)[0]
ver = buf[mvhd[1]]
if ver == 1:
    ts = struct.unpack('>I', buf[mvhd[1]+20:mvhd[1]+24])[0]
    dur = struct.unpack('>Q', buf[mvhd[1]+24:mvhd[1]+32])[0]
else:
    ts = struct.unpack('>I', buf[mvhd[1]+12:mvhd[1]+16])[0]
    dur = struct.unpack('>I', buf[mvhd[1]+16:mvhd[1]+20])[0]
TOTAL_DUR = dur / ts
for (t,o,c,e) in kids(moov[2], moov[3]):
    if t != b'trak': continue
    mdia = find_all(c,e,b'mdia',CONT)[0]
    hdlr = find_all(mdia[1],mdia[2],b'hdlr',CONT)[0]
    handler = buf[hdlr[1]+8:hdlr[1]+12]
    if handler != b'soun': continue
    stbl = find_all(mdia[1],mdia[2],b'stbl',CONT)[0]
    stsd = find_all(stbl[1],stbl[2],b'stsd',CONT)[0]
    et, eo, ec, ee = box_at(stsd[1]+8)
    channels = struct.unpack('>H', buf[ec+16:ec+18])[0]
    so, sc, se = find_all(stbl[1],stbl[2],b'stsc',CONT)[0]
    nsc = struct.unpack('>I', buf[sc+4:sc+8])[0]
    entries = [struct.unpack('>III', buf[sc+8+i*12:sc+20+i*12])[:2] for i in range(nsc)]
    zo, zc, ze = find_all(stbl[1],stbl[2],b'stsz',CONT)[0]
    nsamp = struct.unpack('>I', buf[zc+8:zc+12])[0]
    sizes = struct.unpack('>%dI' % nsamp, buf[zc+12:zc+12+nsamp*4])
    co, cc, ce = find_all(stbl[1],stbl[2],b'stco',CONT)[0]
    nch = struct.unpack('>I', buf[cc+4:cc+8])[0]
    offs = struct.unpack('>%dI' % nch, buf[cc+8:cc+8+nch*4])
    chunk_spp = [0]*nch
    for i,(fc,spp) in enumerate(entries):
        nxt = entries[i+1][0]-1 if i+1 < len(entries) else nch
        for ch in range(fc-1, nxt):
            chunk_spp[ch] = spp
    fps = nsamp / TOTAL_DUR
    start_frame = int(T_SEC * fps)
    want_frames = int(N_SEC * fps)
    # find start chunk
    idx = 0; start_chunk = 0
    for ch in range(nch):
        if idx + chunk_spp[ch] > start_frame:
            start_chunk = ch; break
        idx += chunk_spp[ch]
    tail = open(TAIL,'rb'); out = open(OUT,'wb')
    FREQ_IDX = 3; total = 0; got = 0
    for ch in range(start_chunk, nch):
        if got >= want_frames: break
        coff = offs[ch]
        if coff < TAIL_ABS:
            idx += chunk_spp[ch]; continue
        tail.seek(coff - TAIL_ABS)
        nsp = chunk_spp[ch]
        data = tail.read(sum(sizes[idx:idx+nsp]))
        p = 0
        for s in range(nsp):
            if got >= want_frames: break
            slen = sizes[idx+s]
            frame = data[p:p+slen]; p += slen
            flen = slen + 7
            hdr = bytes([0xFF, 0xF1, (1<<6)|(FREQ_IDX<<2)|(channels>>2),
                ((channels&3)<<6)|(flen>>11), (flen>>3)&0xFF, ((flen&7)<<5)|0x1F, 0xFC])
            out.write(hdr); out.write(frame); total += flen; got += 1
        idx += nsp
    out.close(); tail.close()
    print("wrote", OUT, total, "bytes,", got, "frames")
