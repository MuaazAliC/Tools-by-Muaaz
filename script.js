const filesEl = document.getElementById('files');
const fileBtn = document.querySelector('.file-btn');
fileBtn.addEventListener('click', () => filesEl.click());

const thumbs = document.getElementById('thumbs');
const generateBtn = document.getElementById('generate');
const clearBtn = document.getElementById('clear');
const output = document.getElementById('output');
const downloadLink = document.getElementById('downloadLink');
const openInNew = document.getElementById('openInNew');
const paperEl = document.getElementById('paper');
const orientEl = document.getElementById('orient');
const qualityEl = document.getElementById('quality');
const progWrap = document.querySelector('.progress');
const progBar = document.getElementById('prog');
const filenameEl = document.getElementById('filename');
const watermarkEl = document.getElementById('watermark');
const watermarkColorEl = document.getElementById('watermarkColor');

let selectedFiles = [];

filesEl.addEventListener('change', e => {
  const list = Array.from(e.target.files);
  selectedFiles = selectedFiles.concat(list);
  renderThumbs();
  filesEl.value = '';
});

function renderThumbs(){
  thumbs.innerHTML = '';
  selectedFiles.forEach((file, i)=>{
    const box = document.createElement('div'); box.className='thumb';
    const img = document.createElement('img');
    img.src = URL.createObjectURL(file);
    img.onload = ()=>{ URL.revokeObjectURL(img.src) };
    const rem = document.createElement('div'); rem.className='remove'; rem.textContent='✕';
    rem.onclick = ()=>{ selectedFiles.splice(i,1); renderThumbs(); }
    box.appendChild(img); box.appendChild(rem);
    thumbs.appendChild(box);
  });
}

clearBtn.addEventListener('click', ()=>{
  selectedFiles = [];
  renderThumbs();
  output.style.display = 'none';
  progWrap.style.display = 'none';
  filenameEl.value = '';
  watermarkEl.value = '';
  watermarkColorEl.value = '#b4b4b4';
});

downloadLink.addEventListener('click', ()=>{
  selectedFiles = [];
  renderThumbs();
  output.style.display = 'none';
  progWrap.style.display = 'none';
  filenameEl.value = '';
  watermarkEl.value = '';
  watermarkColorEl.value = '#b4b4b4';
});

generateBtn.addEventListener('click', async ()=>{
  if(selectedFiles.length === 0){ alert('Select at least one image.'); return }
  generateBtn.disabled = true; generateBtn.textContent = 'Generating...';
  progWrap.style.display = 'block'; progBar.style.width = '0%';

  try{
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: 'mm', format: paperEl.value, orientation: orientEl.value });
    const pageSize = doc.internal.pageSize;
    const pageWidth = pageSize.getWidth();
    const pageHeight = pageSize.getHeight();
    const margin = 8;
    const usableW = pageWidth - margin*2;
    const usableH = pageHeight - margin*2;

    const watermarkText = watermarkEl.value.trim();
    const watermarkColor = watermarkColorEl.value; // HEX

    for(let i=0;i<selectedFiles.length;i++){
      const file = selectedFiles[i];
      progBar.style.width = Math.round((i/selectedFiles.length)*100) + '%';
      const imgData = await fileToDataUrl(file);
      const down = await downscaleImage(imgData, usableW, usableH, parseFloat(qualityEl.value));
      const imgProps = await getImageProps(down);
      const imgWmm = (imgProps.width / imgProps.dpi) * 25.4;
      const imgHmm = (imgProps.height / imgProps.dpi) * 25.4;
      const ratio = Math.min(usableW / imgWmm, usableH / imgHmm);
      const drawW = imgWmm * ratio;
      const drawH = imgHmm * ratio;
      const x = (pageWidth - drawW)/2;
      const y = (pageHeight - drawH)/2;
      doc.addImage(down, 'JPEG', x, y, drawW, drawH);

     
      if(watermarkText){
        doc.setFontSize(40);
        doc.setTextColor(watermarkColor);
        doc.setFont('helvetica', 'bold');
        doc.text(watermarkText, pageWidth/2, pageHeight/2, { align: 'center', angle: 45 });
      }

      if(i < selectedFiles.length - 1) doc.addPage();
    }

    progBar.style.width = '100%';
    const blob = doc.output('blob');
    const url = URL.createObjectURL(blob);
    const fname = filenameEl.value.trim() || 'images.pdf';
    downloadLink.href = url; downloadLink.download = fname;
    openInNew.onclick = ()=>window.open(url, '_blank');
    output.style.display = 'flex';

  }catch(err){ alert('Error: '+err.message); }
  finally{ generateBtn.disabled = false; generateBtn.textContent = 'Generate PDF'; }
});

function fileToDataUrl(file){
  return new Promise((res, rej)=>{
    const reader = new FileReader();
    reader.onload = ()=>res(reader.result);
    reader.onerror = rej;
    reader.readAsDataURL(file);
  });
}

function getImageProps(dataUrl){
  return new Promise((res)=>{
    const img = new Image();
    img.onload = ()=>res({ width: img.width, height: img.height, dpi: 96 });
    img.src = dataUrl;
  });
}

function downscaleImage(dataUrl, targetMmW, targetMmH, quality){
  return new Promise((res)=>{
    const img = new Image();
    img.onload = ()=>{
      const dpi = 96;
      const targetPxW = Math.round((targetMmW/25.4) * dpi);
      const targetPxH = Math.round((targetMmH/25.4) * dpi);
      const ratio = Math.min(targetPxW / img.width, targetPxH / img.height, 1);
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(img.width * ratio));
      canvas.height = Math.max(1, Math.round(img.height * ratio));
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#fff'; ctx.fillRect(0,0,canvas.width,canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      res(canvas.toDataURL('image/jpeg', quality));
    };
    img.src = dataUrl;
  });
}
