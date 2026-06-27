module.exports = (req, res, next) => {
  const urlLength = (req.originalUrl || req.url || '').length;
  if (urlLength > 2000) {
    return res.status(414).json({ success: false, error: 'URI Too Long' });
  }
  next();
};
