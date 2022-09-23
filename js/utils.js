function confirmAction(title, content, callback) {
  if (confirm(content)) {
    callback();
  }
}