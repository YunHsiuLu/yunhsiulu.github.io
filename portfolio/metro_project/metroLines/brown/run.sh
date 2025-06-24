for name in Dingpu Yongning Tucheng Haishan FE-Hospital Fuzhong Banqiao Xinpu Jiangzicui LongshanTemple Ximen ShandaoTemple ZhongxiaoXinsheng ZhongXiaoFuxing ZhongxiaoDunhua SYS TaipeiCityHall Yongchun Houshanpi Kunyang Nangang Nangang-EC; do
  cat << EOF > $name.js
export default {
    title: '',
    description: ''
}
EOF
done
