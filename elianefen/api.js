export default function handler(req, res) {
  // O "User-Agent" é a identidade do navegador/robô
  const userAgent = req.headers['user-agent']?.toLowerCase() || '';
  
  // Lista de nomes que identificam robôs das redes sociais
  const bots = ['tiktok', 'instagram', 'facebook', 'twitter', 'whatsapp', 'bot', 'crawler', 'spider'];
  
  // Verifica se o nome do navegador contém algum dos bots da lista
  const isBot = bots.some(bot => userAgent.includes(bot));

  if (isBot) {
    // Se for robô, manda para a página de fachada
    return res.redirect(302, '/fachada.html');
  } else {
    // Se for uma pessoa normal, manda para o seu site real
    return res.redirect(302, '/index.html');
  }
}