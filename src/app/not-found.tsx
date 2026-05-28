export default function NotFound() {
  return (
    <div style={{minHeight:'100vh', background:'#f5f7f5', display:'flex', alignItems:'center', justifyContent:'center', padding:'20px'}}>

      <div style={{textAlign:'center', maxWidth:'480px', width:'100%'}}>

        <div style={{marginBottom:'24px'}}>
          <a href="/" style={{display:'inline-flex', alignItems:'center', gap:'8px', textDecoration:'none'}}>
            <div style={{width:'38px', height:'38px', background:'#f5a623', borderRadius:'10px', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'19px'}}>🦁</div>
            <span style={{fontFamily:'Syne,sans-serif', fontWeight:800, fontSize:'1.4rem', color:'#111a14'}}>Soko<span style={{color:'#1a7a4a'}}>Deal</span></span>
          </a>
        </div>

        <div style={{background:'white', borderRadius:'20px', padding:'48px 32px', border:'1px solid #e8ede9', boxShadow:'0 4px 24px rgba(0,0,0,0.06)'}}>
          <div style={{fontSize:'5rem', marginBottom:'16px'}}>🔍</div>
          <h1 style={{fontFamily:'Syne,sans-serif', fontWeight:800, fontSize:'1.6rem', color:'#111a14', marginBottom:'8px'}}>
            Page introuvable
          </h1>
          <p style={{color:'#6b7c6e', fontSize:'0.92rem', lineHeight:1.7, marginBottom:'32px'}}>
            La page que vous recherchez n existe pas ou a ete deplacee. Retournez a l accueil pour trouver ce que vous cherchez.
          </p>

          <div style={{display:'flex', flexDirection:'column', gap:'10px'}}>
            <a href="/" style={{display:'block', padding:'13px', background:'#1a7a4a', borderRadius:'10px', fontFamily:'Syne,sans-serif', fontWeight:800, fontSize:'0.95rem', color:'white', textDecoration:'none'}}>
              Retour a l accueil →
            </a>
            <a href="/publier" style={{display:'block', padding:'12px', background:'#f5f7f5', borderRadius:'10px', fontFamily:'Syne,sans-serif', fontWeight:700, fontSize:'0.9rem', color:'#111a14', textDecoration:'none', border:'1px solid #e8ede9'}}>
              + Publier une annonce
            </a>
          </div>

          <div style={{marginTop:'28px', paddingTop:'24px', borderTop:'1px solid #f0f4f1'}}>
            <p style={{fontSize:'0.8rem', color:'#6b7c6e', marginBottom:'12px'}}>Vous cherchez quelque chose en particulier ?</p>
            <div style={{display:'flex', gap:'8px', flexWrap:'wrap', justifyContent:'center'}}>
              {[
                {label:'🏡 Immobilier', cat:'immo-vente'},
                {label:'🚗 Voitures', cat:'voiture'},
                {label:'📱 Electronique', cat:'electronique'},
                {label:'💼 Emploi', cat:'emploi'},
              ].map((item) => (
                <a key={item.cat} href={'/?cat=' + item.cat} style={{padding:'6px 12px', background:'#f5f7f5', border:'1px solid #e8ede9', borderRadius:'8px', fontSize:'0.8rem', color:'#111a14', textDecoration:'none', fontWeight:600}}>
                  {item.label}
                </a>
              ))}
            </div>
          </div>
        </div>

        <p style={{marginTop:'16px', fontSize:'0.78rem', color:'#6b7c6e'}}>
          © 2025 SokoDeal · Made in Africa 🌍
        </p>
      </div>
    </div>
  )
}
