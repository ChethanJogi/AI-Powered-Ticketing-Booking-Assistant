import { Link } from 'react-router-dom';
import Icon from './Icon.jsx';

// variant: primary | outline | ghost | danger     size: md | sm
export default function Button({ children, to, variant = 'primary', size = 'md', icon, full, className = '', ...rest }) {
  const cls = `btn btn-${variant} btn-${size} ${full ? 'btn-full' : ''} ${className}`;
  const content = (<>{icon && <Icon name={icon} size={16} />}{children}</>);
  if (to) return <Link to={to} className={cls} {...rest}>{content}</Link>;
  return <button className={cls} {...rest}>{content}</button>;
}
