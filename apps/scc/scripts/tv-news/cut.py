import subprocess, sys
from concurrent.futures import ThreadPoolExecutor
SEGS=[("sb",74,408,396,704,164,120,"S1"),("sc",62,249,500,888,148,96,"S2"),("na",68,408,396,704,436,11,"N1"),("nb",85,249,392,698,442,13,"N2")]
def seg(s):
    f,a,n,cw,ch,x,y,o=s
    fc=(f"[0:v]trim=start_frame={a}:end_frame={a+n},setpts=PTS-STARTPTS,crop={cw}:{ch}:{x}:{y},scale=608:1080:flags=lanczos,setsar=1[v];"
        f"[0:a]atrim=start={a/30}:end={(a+n)/30},asetpts=PTS-STARTPTS,pan=mono|c0=0.5*c0+0.5*c1,afade=t=in:d=0.05,afade=t=out:st={n/30-0.08}:d=0.08[a]")
    subprocess.run(["ffmpeg","-v","error","-y","-i",f+".mp4","-filter_complex",fc,"-map","[v]","-map","[a]","-r","30","-c:v","libx264","-crf","10","-preset","fast","-c:a","pcm_s16le",o+".mov"],check=True)
with ThreadPoolExecutor(4) as ex: list(ex.map(seg,SEGS))
for s in "SN":
    open(s+".txt","w").write(f"file {s}1.mov\nfile {s}2.mov\n")
    subprocess.run(["ffmpeg","-v","error","-y","-f","concat","-i",s+".txt","-c:v","libx264","-crf","10","-preset","fast","-c:a","pcm_s16le",s+".mov"],check=True)
