for name in Nanshijiao Jingan Yongan Dingxi Guting Dongmen Songjiangnanjing XingtianTemple Zhongshan-ES Daqiaotou Taipei-bridge Cailiao Sanchong XianseTemple Touqianzhuang Xinzhuang FuJen-University Danfeng Huilong Sanchong-ES Sanhe-JHS St-Ignatius-HS Sanmin-HS Luzhou; do
  cat << EOF > $name.js
export default {
    title: '',
    description: ''
}
EOF
done
