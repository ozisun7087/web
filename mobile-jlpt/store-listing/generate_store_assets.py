#!/usr/bin/env python3
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import json

ROOT=Path(__file__).resolve().parents[1]
IOS=ROOT/'ios'/'JLPTStudyLab'/'Assets.xcassets'
STORE=ROOT/'store-listing'/'generated'
BLUE=(60,91,220); INK=(24,34,55); WHITE=(255,255,255); SOFT=(238,243,255)

def icon(size):
    im=Image.new('RGB',(size,size),BLUE); d=ImageDraw.Draw(im)
    m=int(size*.18); r=int(size*.08)
    d.rounded_rectangle((m,int(size*.16),size-m,int(size*.82)),radius=r,fill=WHITE)
    x=int(size*.28)
    for y,w in [(.31,.42),(.45,.32),(.59,.38)]:
        yy=int(size*y); h=max(2,int(size*.055))
        d.rounded_rectangle((x,yy,x+int(size*w),yy+h),radius=max(1,int(size*.02)),fill=BLUE)
    cx=int(size*.72); cy=int(size*.68); th=max(2,int(size*.055)); arm=int(size*.18)
    d.rounded_rectangle((cx-th//2,cy-arm//2,cx+th//2,cy+arm//2),radius=max(1,th//3),fill=INK)
    d.rounded_rectangle((cx-arm//2,cy-th//2,cx+arm//2,cy+th//2),radius=max(1,th//3),fill=INK)
    return im

def main():
    app=IOS/'AppIcon.appiconset'; app.mkdir(parents=True,exist_ok=True); STORE.mkdir(parents=True,exist_ok=True)
    (IOS/'Contents.json').write_text(json.dumps({'info':{'author':'xcode','version':1}},indent=2))
    specs=[
      ('Icon-20@2x.png',40,'iphone','20x20','2x'),('Icon-20@3x.png',60,'iphone','20x20','3x'),
      ('Icon-29@2x.png',58,'iphone','29x29','2x'),('Icon-29@3x.png',87,'iphone','29x29','3x'),
      ('Icon-40@2x.png',80,'iphone','40x40','2x'),('Icon-40@3x.png',120,'iphone','40x40','3x'),
      ('Icon-60@2x.png',120,'iphone','60x60','2x'),('Icon-60@3x.png',180,'iphone','60x60','3x'),
      ('Icon-76.png',76,'ipad','76x76','1x'),('Icon-76@2x.png',152,'ipad','76x76','2x'),
      ('Icon-83.5@2x.png',167,'ipad','83.5x83.5','2x'),('Icon-1024.png',1024,'ios-marketing','1024x1024','1x')]
    images=[]
    for fn,px,idiom,size,scale in specs:
        icon(px).save(app/fn,optimize=True)
        images.append({'idiom':idiom,'size':size,'scale':scale,'filename':fn})
    (app/'Contents.json').write_text(json.dumps({'images':images,'info':{'author':'xcode','version':1}},indent=2))
    icon(512).save(STORE/'google-play-icon-512.png',optimize=True)
    icon(1024).save(STORE/'app-store-icon-1024.png',optimize=True)

    fg=Image.new('RGB',(1024,500),SOFT); d=ImageDraw.Draw(fg); fg.paste(icon(330),(70,85))
    regular='/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc'
    bold='/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc'
    if not Path(regular).exists(): regular='/System/Library/Fonts/Helvetica.ttc'
    if not Path(bold).exists(): bold=regular
    try:
        f1=ImageFont.truetype(bold,68); f2=ImageFont.truetype(regular,32)
        d.text((445,130),'JLPT Study Lab',fill=INK,font=f1)
        d.text((447,240),'N1–N5 Japanese Study',fill=BLUE,font=f2)
        d.text((447,300),'Daily Practice × Review × Full Mock',fill=INK,font=f2)
    except Exception:
        pass
    fg.save(STORE/'google-play-feature-1024x500.png',optimize=True)

if __name__=='__main__': main()
