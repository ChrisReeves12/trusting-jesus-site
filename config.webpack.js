const path = require('path');

module.exports = env => {

    return {
        entry: ['./js/app.js', './sass/app.scss'],
        output: {
            path: path.resolve(__dirname, 'public', 'js'),
            filename: 'app.js'
        },
        module: {
            rules: [
                {
                    test: /\.js$/,
                    exclude: /(node_modules)/,
                    use: [
                        {
                            loader: 'babel-loader'
                        }
                    ]
                },
                {
                    test: /\.(scss|sass)$/,
                    use: [
                        {
                            loader: 'file-loader',
                            options: {
                                name: 'app.css',
                                outputPath: path.join('..', 'css')
                            }
                        },
                        {
                            loader: 'sass-loader'
                        }
                    ]
                }
            ]
        }
    };
};