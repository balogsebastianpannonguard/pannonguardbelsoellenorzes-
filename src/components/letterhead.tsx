import Image from "next/image";

/** A Pannon Guard hivatalos fejléce (ugyanaz, mint az Objektumfelügyelet nyomtatványain). */
export function Letterhead() {
  return (
    <div className="flex items-center gap-5 border-b border-[#14182b]/15 pb-5">
      <Image src="/logo.png" alt="Pannon Guard" width={878} height={1080} className="h-auto w-14" />
      <div className="text-[0.8rem] leading-snug text-[#14182b]">
        <p className="text-[0.95rem] font-bold tracking-wide">PANNON GUARD BIZTONSÁGI SZOLGÁLTATÓ ZRT.</p>
        <p>4026 Debrecen Hatvan utca 39. II/3.</p>
        <p>Telefon: 52/501-991, Fax: 52/501-990</p>
        <p>pannon@pannonguard.hu · www.pannonguard.hu</p>
      </div>
    </div>
  );
}

/** A fejléc HTML-ként a Word-letöltéshez (a logó a futó oldal címéről töltődik be). */
export const LETTERHEAD_HTML = (origin: string) => `
<table style="width:100%;border-bottom:1px solid #c9ccd4;margin-bottom:18pt"><tr>
<td style="width:52pt;vertical-align:middle"><img src="${origin}/logo.png" width="42" height="52" alt="Pannon Guard"></td>
<td style="vertical-align:middle;font-family:Arial,sans-serif;font-size:8.5pt;color:#14182b;line-height:1.35">
<b style="font-size:10pt;letter-spacing:.5pt">PANNON GUARD BIZTONSÁGI SZOLGÁLTATÓ ZRT.</b><br>
4026 Debrecen Hatvan utca 39. II/3.<br>Telefon: 52/501-991, Fax: 52/501-990<br>pannon@pannonguard.hu · www.pannonguard.hu</td>
</tr></table>`;
