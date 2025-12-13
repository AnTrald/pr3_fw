const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Настройка multer как в PHP (слабая валидация)
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadPath = path.join(process.cwd(), 'public/uploads');

        // Создаем папку если нет
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }

        cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
        // ТОЧНО как в PHP: trust original name
        cb(null, file.originalname);
    }
});

const upload = multer({ storage: storage });

class UploadController {
    async store(req, res) {
        try {
            // Используем middleware multer
            upload.single('file')(req, res, function(err) {
                if (err) {
                    console.error('Upload error:', err.message);
                    return res.redirect('back');
                }

                if (!req.file) {
                    // ТОЧНО как в PHP: "Файл не найден"
                    return res.redirect('back');
                }

                const name = req.file.originalname;
                // ТОЧНО как в PHP: "Файл загружен [name]"
                res.redirect('back');
            });

        } catch (error) {
            console.error('UploadController error:', error.message);
            res.redirect('back');
        }
    }
}

module.exports = new UploadController();