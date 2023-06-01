const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

exports.resizeImage = (req, res, next) => {
    if (!req.file) {
        return next();
    }

    const filename = req.file.filename;
    const inputPath = path.join(__dirname, '..', 'images', filename);
    const outputPath = path.join(__dirname, '..', 'images', `${filename.split('.').slice(0, -1).join('_')}_resized.${filename.split('.').pop()}`);

    sharp(inputPath)
        .resize(450, 450, {
            fit: 'inside',  // Pour garder les proportions
            withoutEnlargement: true  // Pour ne pas agrandir une petite image
        })
        .toFile(outputPath)
        .then(() => {
            fs.unlink(inputPath, (err) => {   // Supprimer l'image originale
                if (err) {
                    console.error('Erreur lors de la suppression de l\'image originale:', err);
                    return res.status(500).json({ error: "Une erreur s'est produite lors de la suppression de l'image originale." });
                }

                fs.rename(outputPath, inputPath, (err) => {   // Renommer l'image redimensionnée pour qu'elle ait le nom de l'image originale
                    if (err) {
                        console.error('Erreur lors du renommage de l\'image redimensionnée:', err);
                        return res.status(500).json({ error: "Une erreur s'est produite lors du renommage de l'image redimensionnée." });
                    }

                    console.log('Image redimensionnée avec succès');
                    next();
                });
            });
        })
        .catch(err => {
            console.error('Erreur lors du redimensionnement de l\'image:', err);
            res.status(500).json({ error: "Une erreur s'est produite lors du redimensionnement de l'image." });
        });
};
