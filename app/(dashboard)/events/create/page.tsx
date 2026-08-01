"use client";

import {
  type ChangeEvent,
  type FormEvent,
  useEffect,
  useRef,
  useState,
} from "react";

import { useRouter } from "next/navigation";

import ThemePalettePicker, {
  type EventThemePalette,
} from "@/components/events/ThemePalettePicker";

import {
  DEFAULT_EVENT_THEME,
  createEvent,
  uploadEventCover,
  type EventLanguage,
  type InvitationTemplate,
} from "@/services/eventService";

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

const invitationTemplates: Array<{
  value: InvitationTemplate;
  name: string;
  description: string;
  icon: string;
}> = [
  {
    value: "classic_photo",
    name: "Classic Photo",
    description:
      "Picha kubwa, taarifa za event, countdown, RSVP na Event Pass.",
    icon: "CP",
  },
  {
    value: "elegant_gold",
    name: "Elegant Gold",
    description:
      "Muonekano wa kadi ndefu wenye rangi za dhahabu na maandishi rasmi.",
    icon: "EG",
  },
  {
    value: "luxury_envelope",
    name: "Luxury Envelope",
    description:
      "Bahasha inayofunguka, invitation experience na taarifa zote za event.",
    icon: "LE",
  },
  {
    value: "modern_floral",
    name: "Modern Floral",
    description:
      "Design nyepesi ya kisasa yenye mapambo ya maua na rangi laini.",
    icon: "MF",
  },
  {
    value: "royal_dark",
    name: "Royal Dark",
    description:
      "Dark luxury design yenye metallic accents, split photo na muonekano wa kifalme.",
    icon: "RD",
  },
  {
    value: "minimal_ivory",
    name: "Minimal Ivory",
    description:
      "Editorial ivory stationery yenye portrait ndogo, itinerary na typography safi.",
    icon: "MI",
  },
  {
    value: "african_royal",
    name: "African Royal",
    description:
      "Premium African editorial yenye geometric patterns, asymmetrical photo na royal details.",
    icon: "AR",
  },
  {
    value: "midnight_luxe",
    name: "Midnight Luxe",
    description:
      "Cinematic evening-gala layout yenye layered hero, floating title panel na fine-line glow.",
    icon: "ML",
  },
  {
    value: "heritage_monogram",
    name: "Heritage Monogram",
    description:
      "Formal heritage stationery yenye monogram crest, cameo portrait na double-frame details.",
    icon: "HM",
  },
  {
    value: "chateau_letterpress",
    name: "Château Letterpress",
    description:
      "European letterpress stationery yenye landscape print, fine frames na initials seal.",
    icon: "CL",
  },
  {
    value: "emerald_botanical_halo",
    name: "Emerald Botanical Halo",
    description:
      "Botanical luxury yenye emerald background, oval photo halo na fine metallic-gold leaves.",
    icon: "EH",
  },
];

type CreateEventForm = {
  title: string;
  event_type: string;
  bride_name: string;
  groom_name: string;
  language: EventLanguage;
  invitation_template: InvitationTemplate;

  ceremony_title: string;
  ceremony_date: string;
  ceremony_time: string;
  ceremony_venue: string;
  ceremony_map_url: string;

  event_date: string;
  event_time: string;
  venue: string;
  reception_map_url: string;

  dress_code: string;
  theme_primary_color: string;
  theme_secondary_color: string;
  theme_accent_color: string;
};

const initialForm: CreateEventForm = {
  title: "",
  event_type: "",
  bride_name: "",
  groom_name: "",
  language: "sw",
  invitation_template: "classic_photo",

  ceremony_title: "Ibada ya Ndoa",
  ceremony_date: "",
  ceremony_time: "",
  ceremony_venue: "",
  ceremony_map_url: "",

  event_date: "",
  event_time: "",
  venue: "",
  reception_map_url: "",

  dress_code: "",
  theme_primary_color:
    DEFAULT_EVENT_THEME.primaryColor,
  theme_secondary_color:
    DEFAULT_EVENT_THEME.secondaryColor,
  theme_accent_color:
    DEFAULT_EVENT_THEME.accentColor,
};

export default function CreateEventPage() {
  const router = useRouter();

  const [formData, setFormData] =
    useState<CreateEventForm>(initialForm);

  const [coverImage, setCoverImage] =
    useState<File | null>(null);

  const [imagePreview, setImagePreview] =
    useState("");

  const [isSaving, setIsSaving] =
    useState(false);

  const [errorMessage, setErrorMessage] =
    useState("");

  const [activeSection, setActiveSection] = useState(0);
  const [themeModalOpen, setThemeModalOpen] = useState(false);
  const [themeCategory, setThemeCategory] = useState("All");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const themeDialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!themeModalOpen) return;
    const previous = document.activeElement as HTMLElement | null;
    const dialog = themeDialogRef.current;
    dialog?.querySelector<HTMLElement>("button")?.focus();
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setThemeModalOpen(false);
      if (event.key !== "Tab" || !dialog) return;
      const controls = [...dialog.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled])')];
      if (!controls.length) return;
      const first = controls[0]; const last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    window.addEventListener("keydown", handleKey);
    return () => { window.removeEventListener("keydown", handleKey); previous?.focus(); };
  }, [themeModalOpen]);

  function handleChange(
    event:
      | ChangeEvent<HTMLInputElement>
      | ChangeEvent<HTMLSelectElement>
  ) {
    const { name, value } = event.target;

    setFormData((currentData) => ({
      ...currentData,
      [name]: value,
    }));

    setErrorMessage("");
  }

  function handleLanguageChange(
    event: ChangeEvent<HTMLSelectElement>
  ) {
    const language =
      event.target.value as EventLanguage;

    setFormData((currentData) => ({
      ...currentData,
      language,
      ceremony_title:
        language === "en"
          ? "Wedding Ceremony"
          : "Ibada ya Ndoa",
    }));

    setErrorMessage("");
  }

  function applyDressCodePalette(
    palette: EventThemePalette
  ) {
    setFormData((currentData) => ({
      ...currentData,
      dress_code: palette.dressCode,
      theme_primary_color:
        palette.primaryColor,
      theme_secondary_color:
        palette.secondaryColor,
      theme_accent_color:
        palette.accentColor,
    }));

    setErrorMessage("");
  }

  function handleImageChange(
    event: ChangeEvent<HTMLInputElement>
  ) {
    setErrorMessage("");

    const selectedFile =
      event.target.files?.[0];

    if (!selectedFile) {
      return;
    }

    if (
      !selectedFile.type.startsWith("image/")
    ) {
      setErrorMessage(
        "Tafadhali chagua file la picha pekee."
      );

      event.target.value = "";
      return;
    }

    if (selectedFile.size > MAX_IMAGE_SIZE) {
      setErrorMessage(
        "Picha ni kubwa sana. Chagua picha isiyozidi 5 MB."
      );

      event.target.value = "";
      return;
    }

    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
    }

    const previewUrl =
      URL.createObjectURL(selectedFile);

    setCoverImage(selectedFile);
    setImagePreview(previewUrl);
  }

  function removeImage() {
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
    }

    setCoverImage(null);
    setImagePreview("");
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setErrorMessage("");
    setIsSaving(true);

    try {
      let coverImageUrl: string | null = null;

      if (coverImage) {
        coverImageUrl =
          await uploadEventCover(coverImage);
      }

      await createEvent({
        title: formData.title,
        event_type: formData.event_type,

        bride_name:
          formData.bride_name || undefined,

        groom_name:
          formData.groom_name || undefined,

        language: formData.language,

        invitation_template:
          formData.invitation_template,

        ceremony_title:
          formData.ceremony_title || undefined,

        ceremony_date:
          formData.ceremony_date || undefined,

        ceremony_time:
          formData.ceremony_time || undefined,

        ceremony_venue:
          formData.ceremony_venue || undefined,

        ceremony_map_url:
          formData.ceremony_map_url || undefined,

        event_date: formData.event_date,
        event_time: formData.event_time,
        venue: formData.venue,

        reception_map_url:
          formData.reception_map_url || undefined,

        dress_code:
          formData.dress_code || undefined,

        theme_primary_color:
          formData.theme_primary_color,

        theme_secondary_color:
          formData.theme_secondary_color,

        theme_accent_color:
          formData.theme_accent_color,

        cover_image_url: coverImageUrl,
      });

      router.push("/events");
      router.refresh();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Event haikuweza kutengenezwa."
      );
    } finally {
      setIsSaving(false);
    }
  }

  const selectedTemplate = invitationTemplates.find((template) => template.value === formData.invitation_template) ?? invitationTemplates[0];
  const steps = ["Basic Information", "Theme & Invitation Design", "Ceremony", "Reception", "Review"];
  const openStep = (step: number) => { setActiveSection(step); document.getElementById(`event-step-${step}`)?.scrollIntoView({ behavior: "smooth", block: "start" }); };

  return (
    <section className="mx-auto max-w-[1480px] pb-24">
      <header className="mb-6 rounded-[18px] border border-stone-200 bg-white px-5 py-5 shadow-[0_14px_40px_rgba(28,25,23,.06)] sm:px-7">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[.16em] text-emerald-700">Smart Event Pass</p>
            <h1 className="mt-1 text-3xl font-black tracking-tight text-slate-950">Create Event</h1>
            <p className="mt-1 text-sm text-slate-500">Build a polished invitation experience in a few focused steps.</p>
          </div>
          <div className="w-full sm:max-w-xs"><div className="flex justify-between text-xs font-bold text-slate-500"><span>Step {activeSection + 1} of 5</span><span>{steps[activeSection]}</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-stone-100"><div className="h-full rounded-full bg-emerald-600 transition-[width] duration-200" style={{width:`${(activeSection+1)*20}%`}}/></div></div>
        </div>
      </header>

      {errorMessage && <div role="alert" className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">{errorMessage}</div>}

      <form onSubmit={handleSubmit} className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_390px]">
        <div className="space-y-3">
          <WizardSection index={0} title="Basic Information" description="The essentials guests will see first." active={activeSection === 0} complete={Boolean(formData.title && formData.event_type)} onOpen={openStep}>
            <div className="grid gap-4 md:grid-cols-2"><Field label="Event Title" name="title" value={formData.title} placeholder="John & Mary Wedding" required onChange={handleChange}/><Field label="Event Type" name="event_type" value={formData.event_type} placeholder="Wedding, Send-off, Birthday" required onChange={handleChange}/><Field label="Bride / Celebrant" name="bride_name" value={formData.bride_name} placeholder="Bride or celebrant name" onChange={handleChange}/><Field label="Groom" name="groom_name" value={formData.groom_name} placeholder="Groom name" onChange={handleChange}/><label className="text-sm font-bold text-slate-700">Invitation Language<select name="language" value={formData.language} disabled={isSaving} onChange={handleLanguageChange} className="mt-1.5 h-[52px] w-full rounded-xl border border-stone-300 bg-white px-4 outline-none focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100"><option value="sw">Kiswahili</option><option value="en">English</option></select></label><Field label="Dress Code" name="dress_code" value={formData.dress_code} placeholder="Royal Blue and Gold" onChange={handleChange}/></div>
            <div className="mt-4"><p className="mb-1.5 text-sm font-bold text-slate-700">Cover Photo</p><input ref={fileInputRef} type="file" accept="image/*" disabled={isSaving} onChange={handleImageChange} className="sr-only"/><div role="button" tabIndex={0} aria-label="Upload event cover photo" onClick={()=>fileInputRef.current?.click()} onKeyDown={(event)=>{if(event.key==="Enter"||event.key===" ")fileInputRef.current?.click();}} onDragOver={(event)=>event.preventDefault()} onDrop={(event)=>{event.preventDefault(); const file=event.dataTransfer.files[0]; if(!file)return; const transfer=new DataTransfer(); transfer.items.add(file); if(fileInputRef.current){fileInputRef.current.files=transfer.files; fileInputRef.current.dispatchEvent(new Event("change",{bubbles:true}));}}} className="rounded-2xl border-2 border-dashed border-stone-300 bg-stone-50 p-4 outline-none transition hover:border-emerald-500 hover:bg-emerald-50/40 focus:ring-4 focus:ring-emerald-100">{imagePreview?<div className="flex items-center gap-4"><img src={imagePreview} alt="Event cover preview" className="h-20 w-24 rounded-xl object-cover"/><div className="min-w-0 flex-1"><p className="truncate font-bold">{coverImage?.name}</p><p className="text-xs text-slate-500">{coverImage ? `${(coverImage.size/1024/1024).toFixed(2)} MB` : "Cover photo"}</p><div className="mt-2 flex gap-3 text-xs font-bold text-emerald-700"><span>Replace</span><button type="button" onClick={(event)=>{event.stopPropagation();removeImage();}} className="text-red-700">Remove</button></div></div></div>:<div className="py-5 text-center"><p className="font-bold text-slate-800">Drop a cover photo here, or click to browse</p><p className="mt-1 text-xs text-slate-500">Image files up to 5 MB</p></div>}</div></div>
          </WizardSection>

          <WizardSection index={1} title="Theme & Invitation Design" description="Choose the visual direction for your invitation." active={activeSection === 1} complete onOpen={openStep}>
            <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4 sm:flex sm:items-center sm:justify-between"><div><p className="text-xs font-black uppercase tracking-wide text-slate-400">Selected Theme</p><div className="mt-2 flex items-center gap-3"><PaletteDots colors={[formData.theme_primary_color,formData.theme_secondary_color,formData.theme_accent_color]}/><div><p className="font-black text-slate-950">{formData.dress_code || "Royal Blue & Gold"}</p><p className="text-sm text-slate-500">{selectedTemplate.name}</p></div></div></div><button type="button" onClick={()=>setThemeModalOpen(true)} className="mt-4 min-h-11 rounded-xl border border-stone-300 bg-white px-4 font-bold shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:mt-0">Change Theme</button></div>
          </WizardSection>

          <WizardSection index={2} title="Ceremony" description="Optional ceremony details and location." active={activeSection === 2} complete={Boolean(formData.ceremony_date || formData.ceremony_venue)} onOpen={openStep}><div className="grid gap-4 md:grid-cols-2"><Field label="Ceremony Title" name="ceremony_title" value={formData.ceremony_title} placeholder="Wedding Ceremony" onChange={handleChange}/><Field label="Date" name="ceremony_date" type="date" value={formData.ceremony_date} onChange={handleChange}/><Field label="Time" name="ceremony_time" type="time" value={formData.ceremony_time} onChange={handleChange}/><Field label="Venue" name="ceremony_venue" value={formData.ceremony_venue} placeholder="Church or ceremony venue" onChange={handleChange}/><div className="md:col-span-2"><Field label="Google Maps Link" name="ceremony_map_url" type="url" value={formData.ceremony_map_url} placeholder="https://maps.google.com/..." onChange={handleChange}/></div></div></WizardSection>

          <WizardSection index={3} title="Reception" description="Main event date, time and venue." active={activeSection === 3} complete={Boolean(formData.event_date && formData.event_time && formData.venue)} onOpen={openStep}><div className="grid gap-4 md:grid-cols-2"><Field label="Reception Date" name="event_date" type="date" value={formData.event_date} required onChange={handleChange}/><Field label="Reception Time" name="event_time" type="time" value={formData.event_time} required onChange={handleChange}/><Field label="Venue" name="venue" value={formData.venue} placeholder="Dar es Salaam" required onChange={handleChange}/><Field label="Google Maps Link" name="reception_map_url" type="url" value={formData.reception_map_url} placeholder="https://maps.google.com/..." onChange={handleChange}/></div></WizardSection>

          <WizardSection index={4} title="Review" description="Confirm everything before creating the event." active={activeSection === 4} complete={false} onOpen={openStep}><div className="grid gap-3 sm:grid-cols-2">{[["Event",formData.title||"Not set",0],["Type",formData.event_type||"Not set",0],["Theme",selectedTemplate.name,1],["Language",formData.language==="sw"?"Kiswahili":"English",0],["Bride / Celebrant",formData.bride_name||"Not set",0],["Groom",formData.groom_name||"Not set",0],["Ceremony",[formData.ceremony_date,formData.ceremony_time,formData.ceremony_venue].filter(Boolean).join(" · ")||"Not set",2],["Reception",[formData.event_date,formData.event_time,formData.venue].filter(Boolean).join(" · ")||"Not set",3]].map(([label,value,step])=><div key={String(label)} className="rounded-xl border border-stone-200 bg-stone-50 p-3"><div className="flex justify-between gap-3"><p className="text-xs font-bold text-slate-500">{label}</p><button type="button" onClick={()=>openStep(Number(step))} className="text-xs font-bold text-emerald-700">Edit</button></div><p className="mt-1 break-words font-bold text-slate-900">{value}</p></div>)}</div></WizardSection>
        </div>

        <aside className="hidden xl:sticky xl:top-6 xl:block"><LiveInvitationPreview form={formData} imagePreview={imagePreview} templateName={selectedTemplate.name}/></aside>
        <details className="rounded-[18px] border bg-white p-4 shadow-sm xl:hidden"><summary className="cursor-pointer font-bold">Preview invitation</summary><div className="mt-4"><LiveInvitationPreview form={formData} imagePreview={imagePreview} templateName={selectedTemplate.name}/></div></details>

        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-stone-200 bg-white/95 px-4 py-3 shadow-[0_-10px_30px_rgba(28,25,23,.08)] backdrop-blur"><div className="mx-auto flex max-w-[1480px] items-center justify-between gap-2"><button type="button" disabled={isSaving} onClick={()=>router.push('/events')} className="min-h-11 rounded-xl px-4 font-bold text-slate-600 hover:bg-stone-100">Cancel</button><div className="flex gap-2"><button type="button" disabled={isSaving} aria-label="Save draft" className="hidden min-h-11 rounded-xl border border-stone-300 px-4 font-bold text-slate-700 hover:shadow-sm sm:block">Save Draft</button><button type="submit" disabled={isSaving} className="min-h-11 rounded-xl bg-emerald-700 px-5 font-black text-white shadow-lg shadow-emerald-900/15 transition hover:-translate-y-0.5 hover:bg-emerald-800 disabled:opacity-50">{isSaving?"Creating Event…":"Create Event"}</button></div></div></div>
      </form>

      {themeModalOpen&&<div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/55 p-3 backdrop-blur-sm" role="presentation" onMouseDown={(event)=>event.target===event.currentTarget&&setThemeModalOpen(false)}><div ref={themeDialogRef} role="dialog" aria-modal="true" aria-labelledby="theme-dialog-title" className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-[22px] bg-white p-5 shadow-2xl sm:p-7"><div className="flex items-start justify-between"><div><h2 id="theme-dialog-title" className="text-2xl font-black">Choose your invitation style</h2><p className="mt-1 text-sm text-slate-500">Selection updates the live preview immediately.</p></div><button type="button" onClick={()=>setThemeModalOpen(false)} aria-label="Close theme picker" className="min-h-11 rounded-xl px-3 font-bold hover:bg-stone-100">Close</button></div><div className="mt-5 flex gap-2 overflow-x-auto pb-2">{["All","Classic","Luxury","Modern","Minimal","Premium"].map(category=><button key={category} type="button" aria-pressed={themeCategory===category} onClick={()=>setThemeCategory(category)} className={`min-h-10 rounded-full px-4 text-sm font-bold ${themeCategory===category?"bg-slate-950 text-white":"bg-stone-100 text-slate-600"}`}>{category}</button>)}</div><div className="mt-4"><ThemePalettePicker primaryColor={formData.theme_primary_color} secondaryColor={formData.theme_secondary_color} accentColor={formData.theme_accent_color} disabled={isSaving} onSelect={applyDressCodePalette}/></div><div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{invitationTemplates.filter((_,index)=>themeCategory==="All"||["Classic","Luxury","Modern","Minimal","Premium"][index%5]===themeCategory).map(template=>{const selected=formData.invitation_template===template.value;return <button key={template.value} type="button" onClick={()=>{setFormData(current=>({...current,invitation_template:template.value}));setThemeModalOpen(false);}} className={`rounded-2xl border-2 p-4 text-left transition hover:-translate-y-0.5 hover:shadow-md ${selected?"border-emerald-600 bg-emerald-50":"border-stone-200"}`}><div className="mb-3 h-28 overflow-hidden rounded-xl" style={{background:`linear-gradient(145deg,${formData.theme_primary_color},${formData.theme_secondary_color})`}}><div className="grid h-full place-items-center text-2xl font-black" style={{color:formData.theme_accent_color}}>{template.icon}</div></div><PaletteDots colors={[formData.theme_primary_color,formData.theme_secondary_color,formData.theme_accent_color]}/><h3 className="mt-2 font-black">{template.name}</h3><p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">{template.description}</p></button>})}</div></div></div>}
    </section>
  );
}

function WizardSection({index,title,description,active,complete,onOpen,children}:{index:number;title:string;description:string;active:boolean;complete:boolean;onOpen:(index:number)=>void;children:React.ReactNode}) { return <section id={`event-step-${index}`} className="scroll-mt-5 overflow-hidden rounded-[18px] border border-stone-200 bg-white shadow-[0_8px_24px_rgba(28,25,23,.05)]"><button type="button" aria-expanded={active} aria-controls={`event-step-panel-${index}`} onClick={()=>onOpen(index)} className="flex w-full items-center gap-4 p-4 text-left outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-emerald-100 sm:p-5"><span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full text-sm font-black ${active?"bg-emerald-700 text-white":complete?"bg-emerald-50 text-emerald-700":"bg-stone-100 text-slate-500"}`}>{complete&&!active?"✓":index+1}</span><span className="min-w-0 flex-1"><span className="block font-black text-slate-950">{title}</span><span className="mt-0.5 block truncate text-xs text-slate-500">{description}</span></span><span className={`text-xl text-slate-400 transition-transform duration-200 ${active?"rotate-180":""}`} aria-hidden="true">⌄</span></button><div id={`event-step-panel-${index}`} className={`grid transition-[grid-template-rows] duration-200 ${active?"grid-rows-[1fr]":"grid-rows-[0fr]"}`}><div className="overflow-hidden"><div className="border-t border-stone-100 px-4 py-5 sm:px-5">{children}</div></div></div></section>; }

function PaletteDots({colors}:{colors:string[]}) { return <span className="flex -space-x-1">{colors.map(color=><span key={color} className="h-5 w-5 rounded-full border-2 border-white shadow" style={{backgroundColor:color}}/>)}</span>; }

function LiveInvitationPreview({form,imagePreview,templateName}:{form:CreateEventForm;imagePreview:string;templateName:string}) { return <div className="rounded-[26px] border border-stone-200 bg-[#f4f1eb] p-5 shadow-[0_18px_50px_rgba(28,25,23,.12)]"><div className="mb-4 flex items-center justify-between"><div><p className="text-xs font-black uppercase tracking-wide text-slate-400">Live Preview</p><p className="font-bold">{templateName}</p></div><PaletteDots colors={[form.theme_primary_color,form.theme_secondary_color,form.theme_accent_color]}/></div><div className="mx-auto w-full max-w-[300px] rounded-[38px] bg-slate-950 p-2 shadow-2xl"><div className="relative min-h-[560px] overflow-hidden rounded-[31px] bg-white text-center transition-colors duration-200" style={{backgroundColor:form.theme_secondary_color,color:form.theme_primary_color}}><div className="mx-auto mt-3 h-5 w-24 rounded-full bg-slate-950"/>{imagePreview?<img src={imagePreview} alt="" className="mt-3 h-52 w-full object-cover transition-opacity duration-200"/>:<div className="mt-3 grid h-52 place-items-center bg-black/5 text-xs font-bold uppercase tracking-wide">Cover photo</div>}<div className="p-6"><p className="text-[10px] font-black uppercase tracking-[.2em]" style={{color:form.theme_accent_color}}>You are invited</p><h2 className="mt-4 font-serif text-3xl font-black">{form.bride_name||"Bride"}<span className="block text-lg">&</span>{form.groom_name||"Groom"}</h2><p className="mt-4 text-sm font-bold">{form.title||"Your Event"}</p><div className="mx-auto my-5 h-px w-16" style={{backgroundColor:form.theme_accent_color}}/><p className="text-xs">{form.event_date||"Event date"} · {form.event_time||"Time"}</p><p className="mt-2 text-xs font-bold">{form.venue||"Reception venue"}</p><div className="mx-auto mt-6 grid h-16 w-16 place-items-center bg-white text-[9px] font-black text-slate-900 shadow">QR</div></div></div></div></div>; }

type FieldProps = {
  label: string;
  name: string;
  value: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
  onChange: (
    event: ChangeEvent<HTMLInputElement>
  ) => void;
};

function Field({
  label,
  name,
  value,
  type = "text",
  placeholder,
  required = false,
  onChange,
}: FieldProps) {
  return (
    <div>
      <label
        htmlFor={name}
        className="mb-2 block text-sm font-medium text-gray-700"
      >
        {label}
      </label>

      <input
        id={name}
        name={name}
        type={type}
        value={value}
        placeholder={placeholder}
        required={required}
        onChange={onChange}
        className="h-[52px] w-full rounded-xl border border-stone-300 bg-white px-4 text-slate-800 outline-none placeholder:text-slate-400 focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100"
      />
    </div>
  );
}
