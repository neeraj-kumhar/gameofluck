module.exports = (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'Vercel API Bridge is working',
    timestamp: new Date().toISOString()
  });
};
