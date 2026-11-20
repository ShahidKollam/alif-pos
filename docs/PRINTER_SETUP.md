# Thermal / receipt printer — what you need (clear steps)

Alif POS uses **Windows printing**. You do not need special POS code until the printer works in Windows first.

## 1. Hardware

- USB (or network) thermal printer, usually **58 mm** or **80 mm** paper
- Install the **Windows driver** from the printer maker (or generic “Generic / Text Only”)

## 2. Test in Windows (before Alif POS)

1. Plug in the printer, power on  
2. Windows → **Settings → Bluetooth & devices → Printers & scanners**  
3. Confirm the printer appears  
4. Open Notepad → type a few lines → **File → Print** → choose that printer  
5. If paper comes out correctly, Windows is ready  

## 3. In Alif POS (current version)

1. Complete a bill → **Save Bill**  
2. Open **Sales History** → open the invoice  
3. Use **Print** (browser/Electron print dialog)  
4. In the print dialog, select your thermal printer  
5. Paper size: try **Roll paper 80×297 mm** or the closest custom size; margins small  

## 4. What we will add later (not required for daily billing)

- Default printer saved in Settings  
- Fixed 58/80 mm receipt layout  
- One-click print after Save without choosing the printer every time  

## 5. If nothing prints

| Check | Action |
|-------|--------|
| Driver | Reinstall vendor driver |
| Paper | Correct width roll, not jammed |
| Default | Set thermal as default in Windows for testing |
| Test page | Printer queue → Print test page |

**Bottom line:** Install and test the printer in Windows first. Alif POS then prints through the normal Windows print dialog.
